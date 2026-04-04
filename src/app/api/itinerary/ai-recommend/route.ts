import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scoreLocation } from "@/lib/scoring/locationScoring";
import { logger } from "@/lib/logger";
import { internalError, badRequest } from "@/lib/api/errors";
import { RATE_LIMITS, DAILY_QUOTAS } from "@/lib/api/rateLimits";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { validateRequestBody, aiRecommendRequestSchema } from "@/lib/api/schemas";
import { LOCATION_ITINERARY_COLUMNS, type LocationDbRow } from "@/lib/supabase/projections";
import { transformDbRowToLocation } from "@/lib/locations/locationService";
import { escapePostgrestValue } from "@/lib/supabase/sanitize";
import { applyActiveLocationFilters } from "@/lib/supabase/filters";
import { extractPlaceIntent, type PlaceIntent } from "@/lib/server/placeRecommender";
import type { TripBuilderData } from "@/types/trip";
import { vibesToInterests } from "@/data/vibes";
import type { Location } from "@/types/location";

export const maxDuration = 60;

interface AiRecommendation {
  id: string;
  name: string;
  city: string;
  category: string;
  image: string;
  rating: number | null;
  reasoning: string;
  score: number;
  shortDescription?: string;
}

/**
 * POST /api/itinerary/ai-recommend
 *
 * AI-powered place recommendations based on natural language queries.
 * Uses Gemini to extract intent, then queries + scores locations.
 */
export const POST = withApiHandler(
  async (request, { context }) => {
    // Validate body
    const validation = await validateRequestBody(request, aiRecommendRequestSchema);
    if (!validation.success) {
      return badRequest("Invalid request body", validation.error, {
        requestId: context.requestId,
      });
    }

    const {
      query,
      cityId,
      dayActivities,
      dayDate,
      tripBuilderData,
      usedLocationIds,
    } = validation.data;

    const supabase = await createClient();

    // Extract intent via Gemini (5s timeout, returns null on failure)
    const intent = await extractPlaceIntent({
      query,
      cityId,
      dayActivities: dayActivities?.map((a: { id?: string; name?: string; category?: string; isAnchor?: boolean }) => ({
        id: a.id,
        name: a.name ?? "",
        category: a.category,
        isAnchor: a.isAnchor,
      })),
      vibes: (tripBuilderData as TripBuilderData | undefined)?.vibes,
    });

    const isFallback = intent === null;

    // Handle command intents (swap, move, remove, optimize_route)
    if (intent && intent.commandType && intent.commandType !== "search") {
      const command = resolveCommand(intent, dayActivities);
      if (command) {
        return NextResponse.json({
          recommendations: [],
          fallback: false,
          command,
        });
      }
      // Resolution failed — fall through to search
    }

    const hasCategories = !!intent?.categories?.length;

    // Helper: build and execute a location query against the city
    const fetchLocations = async (options: {
      categories?: string[];
      searchText?: string;
    }) => {
      let q = applyActiveLocationFilters(
        supabase.from("locations").select(LOCATION_ITINERARY_COLUMNS)
      );

      if (cityId) q = q.ilike("city", cityId);
      if (options.categories?.length) q = q.in("category", options.categories);
      if (options.searchText) {
        const escaped = escapePostgrestValue(options.searchText);
        q = q.or(
          `name.ilike.%${escaped}%,short_description.ilike.%${escaped}%`,
        );
      }

      const { data, error } = await q.limit(50);
      if (error) {
        logger.error("Supabase query failed in ai-recommend", undefined, {
          error: error.message,
          requestId: context.requestId,
        });
        return null;
      }
      return (data ?? []) as unknown as LocationDbRow[];
    };

    // Progressive query: narrow → broad
    let rows: LocationDbRow[] | null = null;

    if (hasCategories) {
      // Pass 1: category filter from Gemini intent
      rows = await fetchLocations({ categories: intent!.categories });
      // Pass 2: broaden — drop categories, keep searchQuery if available
      if (rows?.length === 0 && intent?.searchQuery) {
        rows = await fetchLocations({ searchText: intent.searchQuery });
      }
      // Pass 3: all city locations — let scoring rank them
      if (rows?.length === 0) {
        rows = await fetchLocations({});
      }
    } else if (!isFallback && intent?.searchQuery) {
      // Intent extracted, no categories — use refined searchQuery
      rows = await fetchLocations({ searchText: intent.searchQuery });
      if (rows?.length === 0) {
        rows = await fetchLocations({});
      }
    } else {
      // Gemini failed — extract keywords from raw query
      const keywords = extractKeywords(query);
      if (keywords) {
        rows = await fetchLocations({ searchText: keywords });
      }
      // Broaden to all city locations
      if (!rows?.length) {
        rows = await fetchLocations({});
      }
    }

    if (rows === null) {
      return internalError("Failed to search locations", undefined, {
        requestId: context.requestId,
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({
        recommendations: [],
        fallback: isFallback,
      });
    }

    // Transform and filter out already-used locations
    const usedSet = new Set(usedLocationIds ?? []);
    const locations: Location[] = rows
      .map(transformDbRowToLocation)
      .filter((loc) => !usedSet.has(loc.id));

    if (locations.length === 0) {
      return NextResponse.json({
        recommendations: [],
        fallback: isFallback,
      });
    }

    // Score locations
    const builderData = tripBuilderData as TripBuilderData | undefined;
    const recentCategories = (dayActivities ?? [])
      .map((a: { name?: string; category?: string }) => a.category)
      .filter((c: string | undefined): c is string => !!c);

    // Infer time slot from schedule context (last activity's end time)
    const inferredTimeSlot = inferTimeSlot(dayActivities, intent?.timePreference);

    const scored = locations.map((location) => {
      const result = scoreLocation(location, {
        interests: builderData?.vibes?.length ? vibesToInterests(builderData.vibes) : [],
        travelStyle: builderData?.style ?? "balanced",
        budgetLevel: intent?.pricePreference ?? builderData?.budget?.level,
        accessibility: builderData?.accessibility?.mobility
          ? { wheelchairAccessible: true }
          : undefined,
        availableMinutes: 120,
        recentCategories,
        timeSlot: inferredTimeSlot,
        date: dayDate,
        preferredTags: intent?.tags,
        group: builderData?.group
          ? {
              size: builderData.group.size ?? undefined,
              type: builderData.group.type,
              childrenAges: builderData.group.childrenAges,
            }
          : undefined,
        dietaryRestrictions: builderData?.accessibility?.dietary,
      });
      return { loc: location, score: result.score, reasoning: result.reasoning };
    });

    // Sort by score and take top 5
    scored.sort((a, b) => b.score - a.score);
    const top5 = scored.slice(0, 5);

    // Build response
    const recommendations: AiRecommendation[] = top5.map((item) => {
      const reasoning = buildReasoning(item.reasoning, intent);

      return {
        id: item.loc.id,
        name: item.loc.name,
        city: item.loc.city,
        category: item.loc.category,
        image: item.loc.image,
        rating: item.loc.rating ?? null,
        reasoning,
        score: Math.round(item.score),
        shortDescription: item.loc.shortDescription,
      };
    });

    return NextResponse.json({
      recommendations,
      fallback: isFallback,
    });
  },
  { rateLimit: RATE_LIMITS.AI_RECOMMEND, dailyQuota: DAILY_QUOTAS.AI_RECOMMEND, optionalAuth: true, requireJson: true },
);

/**
 * Extracts meaningful keywords from a raw natural language query.
 * Strips stop words so ILIKE has a chance of matching location names/descriptions.
 */
function extractKeywords(query: string): string | undefined {
  const stopWords = new Set([
    "i", "we", "me", "my", "our", "want", "to", "go", "a", "an", "the",
    "when", "get", "in", "from", "at", "for", "some", "find", "looking",
    "need", "would", "like", "can", "could", "should", "where", "what",
    "is", "are", "be", "do", "does", "have", "has", "with", "that", "this",
    "it", "of", "on", "and", "or", "but", "not", "no", "something",
    "somewhere", "place", "spot", "good", "nice", "great", "best", "near",
    "nearby", "around", "here", "there", "after", "before",
  ]);
  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => !stopWords.has(w) && w.length > 2);
  return words.length > 0 ? words[0] : undefined;
}

/**
 * Infers the appropriate time slot based on the last activity's departure time.
 * Falls back to the intent's timePreference, or undefined if neither is available.
 */
function inferTimeSlot(
  dayActivities: Array<{ departureTime?: string; [key: string]: unknown }> | undefined,
  intentTimePreference?: "morning" | "afternoon" | "evening",
): "morning" | "afternoon" | "evening" | undefined {
  // Try to infer from the last activity's end time
  if (dayActivities?.length) {
    // Find the last activity with a departureTime
    for (let i = dayActivities.length - 1; i >= 0; i--) {
      const dep = dayActivities[i]?.departureTime;
      if (typeof dep === "string" && dep.includes(":")) {
        const hour = parseInt(dep.split(":")[0] ?? "0", 10);
        if (!isNaN(hour)) {
          if (hour < 12) return "morning";
          if (hour < 17) return "afternoon";
          return "evening";
        }
      }
    }
  }

  return intentTimePreference;
}

interface CommandResponse {
  type: "swap" | "move" | "remove" | "optimize_route";
  targetActivityId: string;
  secondActivityId?: string;
  movePosition?: "before" | "after";
  description: string;
}

/**
 * Resolves a command intent into concrete activity IDs.
 * Returns null if resolution fails (e.g. activity not found, anchor blocked).
 */
function resolveCommand(
  intent: PlaceIntent,
  dayActivities: Array<{ id?: string; name?: string; isAnchor?: boolean; [key: string]: unknown }> | undefined,
): CommandResponse | null {
  const activities = (dayActivities ?? []).filter((a) => a.id && a.name);

  if (intent.commandType === "optimize_route") {
    return {
      type: "optimize_route",
      targetActivityId: "",
      description: "Optimizing route for best travel efficiency",
    };
  }

  // Fuzzy match an activity name to an ID
  const findActivity = (name?: string) => {
    if (!name) return null;
    const lower = name.toLowerCase();
    // Exact match
    const exact = activities.find((a) => a.name?.toLowerCase() === lower);
    if (exact) return exact;
    // Prefix match
    const prefix = activities.find((a) => a.name?.toLowerCase().startsWith(lower));
    if (prefix) return prefix;
    // Contains match
    const contains = activities.find((a) => a.name?.toLowerCase().includes(lower));
    if (contains) return contains;
    // Reverse contains (query name contained in activity name)
    const reverseContains = activities.find((a) =>
      lower.includes(a.name?.toLowerCase() ?? ""),
    );
    if (reverseContains) return reverseContains;
    return null;
  };

  const target = findActivity(intent.targetActivityName);
  if (!target || !target.id) return null;

  // Block commands on anchor activities
  if (target.isAnchor) return null;

  switch (intent.commandType) {
    case "remove":
      return {
        type: "remove",
        targetActivityId: target.id,
        description: `Removing ${target.name}`,
      };

    case "swap": {
      const second = findActivity(intent.secondActivityName);
      if (!second || !second.id || second.isAnchor) return null;
      return {
        type: "swap",
        targetActivityId: target.id,
        secondActivityId: second.id,
        description: `Swapping ${target.name} and ${second.name}`,
      };
    }

    case "move": {
      const ref = findActivity(intent.secondActivityName);
      if (!ref || !ref.id) return null;
      return {
        type: "move",
        targetActivityId: target.id,
        secondActivityId: ref.id,
        movePosition: intent.movePosition ?? "before",
        description: `Moving ${target.name} ${intent.movePosition ?? "before"} ${ref.name}`,
      };
    }

    default:
      return null;
  }
}

/**
 * Builds a concise reasoning string from score reasoning array and intent.
 */
function buildReasoning(
  reasoning: string[],
  intent: PlaceIntent | null,
): string {
  // Take the first 2 most relevant reasoning points
  const filtered = reasoning
    .filter((r) => !r.includes("logistical") && !r.includes("distance"))
    .slice(0, 2);

  if (filtered.length > 0) {
    return filtered.join(". ");
  }

  if (intent?.categories?.length) {
    return `Matches your search for ${intent.categories[0]} options`;
  }

  return "Good match for your trip";
}
