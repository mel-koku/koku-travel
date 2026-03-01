import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scoreLocation } from "@/lib/scoring/locationScoring";
import { logger } from "@/lib/logger";
import { internalError, badRequest } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import {
  createRequestContext,
  addRequestContextHeaders,
  requireJsonContentType,
} from "@/lib/api/middleware";
import { validateRequestBody, aiRecommendRequestSchema } from "@/lib/api/schemas";
import { LOCATION_ITINERARY_COLUMNS, type LocationDbRow } from "@/lib/supabase/projections";
import { transformDbRowToLocation } from "@/lib/locations/locationService";
import { extractPlaceIntent, type PlaceIntent } from "@/lib/server/placeRecommender";
import type { TripBuilderData } from "@/types/trip";
import type { Location } from "@/types/location";

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
export async function POST(request: NextRequest) {
  const ctx = createRequestContext(request);

  // Rate limit
  const rateLimitResponse = await checkRateLimit(request, RATE_LIMITS.AI_RECOMMEND);
  if (rateLimitResponse) return addRequestContextHeaders(rateLimitResponse, ctx, request);

  // Content-type check
  const ctCheck = requireJsonContentType(request, ctx);
  if (ctCheck) return ctCheck;

  // Validate body
  const validation = await validateRequestBody(request, aiRecommendRequestSchema);
  if (!validation.success) {
    return badRequest("Invalid request body", validation.error, {
      requestId: ctx.requestId,
    });
  }

  const {
    query,
    cityId,
    dayActivities,
    tripBuilderData,
    usedLocationIds,
  } = validation.data;

  try {
    const supabase = await createClient();

    // Extract intent via Gemini (5s timeout, returns null on failure)
    const intent = await extractPlaceIntent({
      query,
      cityId,
      dayActivities: dayActivities?.map((a: { name?: string; category?: string }) => ({
        name: a.name ?? "",
        category: a.category,
      })),
      interests: (tripBuilderData as TripBuilderData | undefined)?.interests,
    });

    const isFallback = intent === null;

    // Build Supabase query
    let dbQuery = supabase
      .from("locations")
      .select(LOCATION_ITINERARY_COLUMNS)
      .or("business_status.is.null,business_status.neq.PERMANENTLY_CLOSED");

    // City filter
    if (cityId) {
      dbQuery = dbQuery.ilike("city", cityId);
    }

    // Apply intent-based filters
    if (intent?.categories?.length) {
      dbQuery = dbQuery.in("category", intent.categories);
    }

    // Text search — use intent's searchQuery or raw query as fallback
    const searchText = intent?.searchQuery ?? (isFallback ? query : null);
    if (searchText) {
      dbQuery = dbQuery.or(
        `name.ilike.%${searchText}%,short_description.ilike.%${searchText}%`,
      );
    }

    dbQuery = dbQuery.limit(50);

    const { data: rows, error: dbError } = await dbQuery;

    if (dbError) {
      logger.error("Supabase query failed in ai-recommend", undefined, {
        error: dbError.message,
        requestId: ctx.requestId,
      });
      return internalError("Failed to search locations", undefined, {
        requestId: ctx.requestId,
      });
    }

    if (!rows || rows.length === 0) {
      const response = NextResponse.json({
        recommendations: [],
        fallback: isFallback,
      });
      return addRequestContextHeaders(response, ctx, request);
    }

    // Transform and filter out already-used locations
    const usedSet = new Set(usedLocationIds ?? []);
    const locations: Location[] = (rows as unknown as LocationDbRow[])
      .map(transformDbRowToLocation)
      .filter((loc) => !usedSet.has(loc.id));

    if (locations.length === 0) {
      const response = NextResponse.json({
        recommendations: [],
        fallback: isFallback,
      });
      return addRequestContextHeaders(response, ctx, request);
    }

    // Score locations
    const builderData = tripBuilderData as TripBuilderData | undefined;
    const recentCategories = (dayActivities ?? [])
      .map((a: { name?: string; category?: string }) => a.category)
      .filter((c: string | undefined): c is string => !!c);

    const scored = locations.map((location) => {
      const result = scoreLocation(location, {
        interests: builderData?.interests ?? [],
        travelStyle: builderData?.style ?? "balanced",
        budgetLevel: builderData?.budget?.level,
        accessibility: builderData?.accessibility?.mobility
          ? { wheelchairAccessible: true }
          : undefined,
        availableMinutes: 120,
        recentCategories,
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

    const response = NextResponse.json({
      recommendations,
      fallback: isFallback,
    });
    return addRequestContextHeaders(response, ctx, request);
  } catch (error) {
    logger.error(
      "AI recommend failed",
      error instanceof Error ? error : new Error(String(error)),
      { requestId: ctx.requestId },
    );
    return internalError("Failed to generate recommendations", undefined, {
      requestId: ctx.requestId,
    });
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
