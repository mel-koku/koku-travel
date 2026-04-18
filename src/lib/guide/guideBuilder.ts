/**
 * Guide Builder — Orchestrates building a TripGuide from an Itinerary.
 *
 * Pure function, runs in useMemo — no async, no API calls.
 * Takes itinerary data and produces guide segments (intros, transitions,
 * cultural moments, practical tips, summaries, and trip overview).
 */

import type { Itinerary, ItineraryActivity, ItineraryDay } from "@/types/itinerary";
import { detectNeighborhoodClusters } from "@/lib/itinerary/neighborhoodDetector";
import type { TripBuilderData } from "@/types/trip";
import type {
  TripGuide,
  DayGuide,
  GuideSegment,
  ResolvedCategory,
} from "@/types/itineraryGuide";
import type { GeneratedGuide } from "@/types/llmConstraints";

import { DAY_INTRO_TEMPLATES } from "@/data/guide/dayIntros";
import { TRANSITION_TEMPLATES } from "@/data/guide/transitions";
import { CULTURAL_MOMENT_TEMPLATES } from "@/data/guide/culturalMoments";
import { PRACTICAL_TIP_TEMPLATES } from "@/data/guide/practicalTips";
import { DAY_SUMMARY_TEMPLATES } from "@/data/guide/daySummaries";
import { TRIP_OVERVIEW_TEMPLATES } from "@/data/guide/tripOverviews";
import { NEIGHBORHOOD_NARRATIVE_TEMPLATES } from "@/data/guide/neighborhoodNarratives";

import {
  resolveActivityCategory,
  getSeason,
  getDayPosition,
  getDayVibe,
  getTipTopicForDay,
  matchDayIntro,
  matchTransition,
  matchCulturalMoment,
  matchPracticalTip,
  matchDaySummary,
  matchTripOverview,
  matchNeighborhoodNarrative,
  initDayIntroIndex,
  initTransitionIndex,
  initCulturalMomentIndex,
  initPracticalTipIndex,
  initDaySummaryIndex,
  initTripOverviewIndex,
  initNeighborhoodNarrativeIndex,
  pickDayIntroOpener,
  pickPhrase,
  TRANSITION_BRIDGES,
  SUMMARY_OPENERS,
  CATEGORY_TO_TIP_TOPIC,
} from "./templateMatcher";

// ── Initialize indexes once at module load ──────────────────────────

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  initDayIntroIndex(DAY_INTRO_TEMPLATES);
  initTransitionIndex(TRANSITION_TEMPLATES);
  initCulturalMomentIndex(CULTURAL_MOMENT_TEMPLATES);
  initPracticalTipIndex(PRACTICAL_TIP_TEMPLATES);
  initDaySummaryIndex(DAY_SUMMARY_TEMPLATES);
  initTripOverviewIndex(TRIP_OVERVIEW_TEMPLATES);
  initNeighborhoodNarrativeIndex(NEIGHBORHOOD_NARRATIVE_TEMPLATES);
  initialized = true;
}

// ── Helpers ─────────────────────────────────────────────────────────

function getPlaceActivities(
  day: ItineraryDay,
): Extract<ItineraryActivity, { kind: "place" }>[] {
  return (day.activities ?? []).filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> =>
      a.kind === "place",
  );
}

function getCityFromDay(day: ItineraryDay): string {
  // Use cityId if available, otherwise try to extract from dateLabel or activities
  if (day.cityId) return day.cityId;

  // Try to get city from first activity's neighborhood
  const activities = getPlaceActivities(day);
  if (activities.length > 0 && activities[0]!.neighborhood) {
    return activities[0]!.neighborhood.toLowerCase();
  }

  return "generic";
}

// Sub-categories that trigger cultural moments.
// Exported so tests can verify that all cultural-moment template keys are
// reachable. If a key like "landmark:tokyo" exists in the data but landmark
// isn't in this set, the template will never fire.
export const CULTURAL_SUBCATEGORIES = new Set([
  "shrine",
  "temple",
  "onsen",
  "market",
  "garden",
  "museum",
  "restaurant",
  "cafe",
  "bar",
  "landmark",
]);

// ── Composition helpers ─────────────────────────────────────────────

type PlaceActivity = Extract<ItineraryActivity, { kind: "place" }>;

function formatActivityList(activities: PlaceActivity[]): string {
  const names = activities.map((a) => a.title);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function composeDayIntro(
  city: string,
  activities: PlaceActivity[],
  dayId: string,
  season: string,
  position: string,
  options?: { isLateArrival?: boolean; startTime?: string },
): GuideSegment {
  let content: string;

  if (activities.length > 0) {
    const opener = pickDayIntroOpener(city, `${dayId}-intro`, options);
    const listing = formatActivityList(activities);
    content = `${opener} Today takes you through ${listing}.`;

    // Optionally append first activity description if available
    const firstDesc = activities[0]?.description;
    if (firstDesc && activities.length <= 3) {
      // Truncate long descriptions
      const short = firstDesc.length > 120 ? firstDesc.slice(0, 117) + "..." : firstDesc;
      content += ` Starting with ${activities[0]!.title}. ${short.charAt(0).toUpperCase() + short.slice(1)}`;
    }
  } else {
    // Fallback to template-based intro when no activities
    const firstCategory = "any";
    const introTemplate = matchDayIntro(city, firstCategory, season, position, `${dayId}-intro`);
    content = introTemplate?.content ?? `A new day in ${capitalize(city)}!`;
  }

  return {
    id: `guide-${dayId}-intro`,
    type: "day_intro",
    content,
    icon: "🌅",
    dayId,
    afterActivityId: null,
  };
}

function shouldShowTransition(
  index: number,
  totalActivities: number,
): boolean {
  // Show transitions between all consecutive activities, but cap at 3 per day
  // to avoid clutter on busy days
  if (totalActivities <= 4) return true;
  // For 5+ activities, show transitions for first 3 gaps only
  return index <= 3;
}

function composeTransition(
  prevActivity: PlaceActivity,
  nextActivity: PlaceActivity,
  dayId: string,
  index: number,
  city: string,
): GuideSegment {
  // Try rich city/category-specific transition template first
  const prevCat = resolveActivityCategory(prevActivity.tags);
  const nextCat = resolveActivityCategory(nextActivity.tags);
  const fromParent = prevCat?.parent ?? "any";
  const toParent = nextCat?.parent ?? "any";

  const transitionTemplate = matchTransition(
    fromParent,
    toParent,
    city,
    `${dayId}-tr-${index}`,
  );

  if (transitionTemplate) {
    return {
      id: `guide-${dayId}-tr-${index}`,
      type: "activity_context",
      content: transitionTemplate.content,
      dayId,
      afterActivityId: prevActivity.id,
      templateId: transitionTemplate.id,
    };
  }

  // Fall back to composed bridge phrase
  const bridge = pickPhrase(
    TRANSITION_BRIDGES,
    `${dayId}-tr-${index}`,
    { name: nextActivity.title },
  );

  const desc = nextActivity.description!;
  const short = desc.length > 150 ? desc.slice(0, 147) + "..." : desc;

  return {
    id: `guide-${dayId}-tr-${index}`,
    type: "activity_context",
    content: `${bridge}. ${short.charAt(0).toUpperCase() + short.slice(1)}`,
    dayId,
    afterActivityId: prevActivity.id,
  };
}

const SUMMARY_CLOSERS_MULTI: string[] = [
  "{opener} {first} to {last}.",
  "{opener} From {first} to {last}. Good ground covered.",
  "{opener} {last} was a solid way to wind down.",
  "{opener} {first} started it, {last} closed it out.",
  "{opener} A full day, {first} to {last}.",
];

const SUMMARY_CLOSERS_SINGLE: string[] = [
  "{opener} {activity} was worth the time.",
  "{opener} Just {activity} today. Sometimes that's enough.",
  "{opener} A focused day around {activity}.",
];

function composeDaySummary(
  city: string,
  activities: PlaceActivity[],
  dayId: string,
  vibe: string = "mixed",
): GuideSegment {
  let content: string;
  const displayCity = capitalize(city);
  const opener = pickPhrase(SUMMARY_OPENERS, `${dayId}-summary`, {
    city: displayCity,
  });

  if (activities.length >= 2) {
    // Try vibe-specific template first, fall back to composed
    const summaryTemplate = matchDaySummary(city, vibe, `${dayId}-summary`);
    if (summaryTemplate) {
      content = summaryTemplate.content;
    } else {
      const first = activities[0]!.title;
      const last = activities[activities.length - 1]!.title;
      content = pickPhrase(SUMMARY_CLOSERS_MULTI, `${dayId}-summary-close`, {
        opener,
        first,
        last,
        city: displayCity,
      });
    }
  } else if (activities.length === 1) {
    content = pickPhrase(SUMMARY_CLOSERS_SINGLE, `${dayId}-summary-close`, {
      opener,
      activity: activities[0]!.title,
      city: displayCity,
    });
  } else {
    const summaryTemplate = matchDaySummary(city, vibe, `${dayId}-summary`);
    content = summaryTemplate?.content ?? `That wraps ${displayCity}.`;
  }

  return {
    id: `guide-${dayId}-summary`,
    type: "day_summary",
    content,
    icon: "🌙",
    dayId,
  };
}

function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Build guide for a single day ────────────────────────────────────

function buildDayGuide(
  day: ItineraryDay,
  dayIndex: number,
  totalDays: number,
  season: string,
  aiIntro?: string,
): DayGuide {
  const activities = getPlaceActivities(day);
  const city = getCityFromDay(day);
  const dayId = day.id;
  const segments: GuideSegment[] = [];

  // Resolve categories for all activities (still needed for cultural moments + tips)
  const resolved: (ResolvedCategory | null)[] = activities.map((a) =>
    resolveActivityCategory(a.tags),
  );
  const subCategories = resolved
    .filter((r): r is ResolvedCategory => r !== null)
    .map((r) => r.sub);

  // ── Day Intro (AI-generated if available, otherwise composed from templates) ──
  const position = getDayPosition(dayIndex, totalDays);
  const intro = aiIntro
    ? {
        id: `guide-${dayId}-intro`,
        type: "day_intro" as const,
        content: aiIntro,
        icon: "🌅",
        dayId,
        afterActivityId: null,
      }
    : composeDayIntro(city, activities, dayId, season, position, {
        isLateArrival: day.isLateArrival,
        startTime: day.bounds?.startTime,
      });

  // ── Transitions + Cultural Moments ──
  let culturalMomentUsed = false;

  for (let i = 1; i < activities.length; i++) {
    const prevActivity = activities[i - 1]!;
    const currActivity = activities[i]!;
    const currResolved = resolved[i];

    // Transitions — only when the next activity has a description worth sharing.
    // Without a description, the transition just restates the next card's name — noise.
    if (shouldShowTransition(i, activities.length) && currActivity.description) {
      segments.push(
        composeTransition(prevActivity, currActivity, dayId, i, city),
      );
    }

    // Cultural moment (max 1 per day) — placed BEFORE the cultural activity to prep the user
    if (!culturalMomentUsed && currResolved) {
      if (CULTURAL_SUBCATEGORIES.has(currResolved.sub)) {
        const cmTemplate = matchCulturalMoment(
          currResolved.sub,
          city,
          `${dayId}-cm-${i}`,
        );

        if (cmTemplate) {
          segments.push({
            id: `guide-${dayId}-cm`,
            type: "cultural_moment",
            content: cmTemplate.content,
            icon: cmTemplate.icon,
            dayId,
            beforeActivityId: currActivity.id,
            templateId: cmTemplate.id,
          });
          culturalMomentUsed = true;
        }
      }
    }
  }

  // If no cultural moment was inserted in the loop, try before the first cultural activity
  if (!culturalMomentUsed && activities.length > 0) {
    for (let i = 0; i < activities.length; i++) {
      const r = resolved[i];
      if (r && CULTURAL_SUBCATEGORIES.has(r.sub)) {
        const cmTemplate = matchCulturalMoment(
          r.sub,
          city,
          `${dayId}-cm-first`,
        );
        if (cmTemplate) {
          segments.push({
            id: `guide-${dayId}-cm`,
            type: "cultural_moment",
            content: cmTemplate.content,
            icon: cmTemplate.icon,
            dayId,
            beforeActivityId: activities[i]!.id,
            templateId: cmTemplate.id,
          });
        }
        break;
      }
    }
  }

  // ── Practical tip (1 per day) — placed BEFORE the relevant activity to prep the user ──
  const tipTopic = getTipTopicForDay(subCategories);
  const tipTemplate = matchPracticalTip(tipTopic, `${dayId}-tip`);

  if (tipTemplate && activities.length > 0) {
    // Find the first activity whose sub-category matches the tip topic
    const tipActivityIndex = subCategories.findIndex(
      (sub) => CATEGORY_TO_TIP_TOPIC[sub] === tipTopic,
    );
    const tipActivity = tipActivityIndex >= 0
      ? activities[tipActivityIndex]
      : activities[0];

    segments.push({
      id: `guide-${dayId}-tip`,
      type: "practical_tip",
      content: tipTemplate.content,
      icon: tipTemplate.icon,
      dayId,
      beforeActivityId: tipActivity!.id,
      templateId: tipTemplate.id,
    });
  }

  // ── Neighborhood Narrative (max 1 per day) ──
  // Scan for runs of 2+ consecutive activities sharing a neighborhood
  if (activities.length >= 2) {
    for (let i = 0; i < activities.length - 1; i++) {
      const currNeighborhood = activities[i]!.neighborhood;
      const nextNeighborhood = activities[i + 1]!.neighborhood;

      if (
        currNeighborhood &&
        nextNeighborhood &&
        currNeighborhood.toLowerCase() === nextNeighborhood.toLowerCase()
      ) {
        // Found a cluster — match narrative via fallback chain
        const narrative = matchNeighborhoodNarrative(
          city,
          currNeighborhood,
          `${dayId}-nn-${i}`,
        );

        if (narrative) {
          segments.push({
            id: `guide-${dayId}-nn`,
            type: "neighborhood_narrative",
            content: narrative.content,
            icon: narrative.icon ?? "🏘️",
            dayId,
            beforeActivityId: activities[i]!.id,
            templateId: narrative.id,
          });
        }
        break; // Max 1 narrative per day
      }
    }
  }

  // ── Neighborhood Walk (3+ consecutive activities in same area) ──
  const clusters = detectNeighborhoodClusters(day);
  if (clusters.length > 0) {
    const cluster = clusters[0]!; // Max 1 walk header per day
    const firstActivityIndex = cluster.activityIndices[0];
    const firstActivityId = firstActivityIndex !== undefined
      ? day.activities[firstActivityIndex]?.id
      : undefined;

    const walkContent = cluster.name === "Walkable Area"
      ? `The next ${cluster.activityNames.length} stops are all within walking distance. Take your time exploring on foot.`
      : `You're about to explore ${cluster.name} on foot. ${cluster.activityNames.length} stops, all walkable from each other.`;

    segments.push({
      id: `guide-${dayId}-nw`,
      type: "neighborhood_walk",
      content: walkContent,
      icon: "🚶",
      dayId,
      beforeActivityId: firstActivityId,
    });
  }

  // ── Day Summary (composed from activity names, vibe-aware) ──
  const parentCategories = resolved
    .filter((r): r is ResolvedCategory => r !== null)
    .map((r) => r.parent);
  const vibe = getDayVibe(parentCategories);
  const summary = composeDaySummary(city, activities, dayId, vibe);

  // Sort segments by their placement position in the activity list.
  // afterActivityId: placed after that activity (use activity index).
  // beforeActivityId: placed before that activity (use index - 0.5 to sort before it).
  const activityOrder = new Map(
    activities.map((a, idx) => [a.id, idx]),
  );
  segments.sort((a, b) => {
    const aIdx = a.beforeActivityId
      ? (activityOrder.get(a.beforeActivityId) ?? 0) - 0.5
      : a.afterActivityId
        ? (activityOrder.get(a.afterActivityId) ?? -1)
        : -1;
    const bIdx = b.beforeActivityId
      ? (activityOrder.get(b.beforeActivityId) ?? 0) - 0.5
      : b.afterActivityId
        ? (activityOrder.get(b.afterActivityId) ?? -1)
        : -1;
    return aIdx - bIdx;
  });

  return {
    dayId,
    intro,
    segments,
    summary,
  };
}

// ── Main export ─────────────────────────────────────────────────────

/**
 * Build a complete TripGuide from an itinerary.
 * Pure function — no async, no API calls. Safe for useMemo.
 *
 * When `guideProse` is provided (from LLM Pass 3), uses generated prose
 * for each segment and falls back to templates for any missing segment.
 */
export function buildGuide(
  itinerary: Itinerary,
  tripBuilderData?: TripBuilderData,
  dayIntros?: Record<string, string>,
  guideProse?: GeneratedGuide,
): TripGuide {
  ensureInitialized();

  const season = getSeason(tripBuilderData?.dates?.start);
  const days = itinerary.days ?? [];
  const totalDays = days.length;

  // Index generated prose by dayId for O(1) lookup
  const proseByDay = guideProse
    ? new Map(guideProse.days.map((d) => [d.dayId, d]))
    : undefined;

  // Build per-day guides, using generated prose when available
  const dayGuides: DayGuide[] = days.map((day, index) => {
    const prose = proseByDay?.get(day.id);

    // Build the template-based guide first (always needed for transitions, cultural moments, etc.)
    const templateGuide = buildDayGuide(
      day, index, totalDays, season,
      // Use AI intro from guideProse if available, then dayIntros, then template
      prose?.intro ?? dayIntros?.[day.id],
    );

    if (!prose) return templateGuide;

    // Merge generated prose into template segments.
    // Single-pass: iterate template segments, substitute LLM prose where available.
    const placeActivities = (day.activities ?? []).filter((a) => a.kind === "place");

    // Build a map of generated transitions by afterActivityId
    const proseTransitions = new Map<string, GuideSegment>();
    for (let i = 0; i < prose.transitions.length && i < placeActivities.length - 1; i++) {
      const prevActivity = placeActivities[i];
      if (prevActivity) {
        proseTransitions.set(prevActivity.id, {
          id: `guide-${day.id}-tr-${i + 1}`,
          type: "activity_context",
          content: prose.transitions[i]!,
          dayId: day.id,
          afterActivityId: prevActivity.id,
        });
      }
    }

    // Track whether culturalMoment and practicalTip have been substituted
    let culturalMomentUsed = false;
    let practicalTipUsed = false;

    const segments: GuideSegment[] = templateGuide.segments.map((segment) => {
      // Replace transitions with LLM prose
      if (segment.type === "activity_context" && segment.afterActivityId) {
        const proseVersion = proseTransitions.get(segment.afterActivityId);
        if (proseVersion) {
          proseTransitions.delete(segment.afterActivityId);
          return proseVersion;
        }
      }

      // Replace cultural moment with LLM prose
      if (segment.type === "cultural_moment" && prose.culturalMoment && !culturalMomentUsed) {
        culturalMomentUsed = true;
        return {
          ...segment,
          id: `guide-${day.id}-cm`,
          content: prose.culturalMoment,
        };
      }

      // Replace practical tip with LLM prose
      if (segment.type === "practical_tip" && prose.practicalTip && !practicalTipUsed) {
        practicalTipUsed = true;
        return {
          ...segment,
          id: `guide-${day.id}-tip`,
          content: prose.practicalTip,
        };
      }

      return segment; // keep template version
    });

    // Add any remaining prose transitions that didn't match template positions
    for (const transition of proseTransitions.values()) {
      segments.push(transition);
    }

    // Use generated summary
    const summary: GuideSegment = prose.summary
      ? {
          id: `guide-${day.id}-summary`,
          type: "day_summary",
          content: prose.summary,
          icon: "🌙",
          dayId: day.id,
        }
      : templateGuide.summary ?? {
          id: `guide-${day.id}-summary`,
          type: "day_summary",
          content: "",
          dayId: day.id,
        };

    return {
      dayId: day.id,
      intro: templateGuide.intro, // Already uses prose.intro via the aiIntro parameter
      segments,
      summary,
    };
  });

  // ── Trip Overview ──
  // Use generated overview if available, otherwise template
  let overview: GuideSegment | undefined;

  if (guideProse?.tripOverview) {
    overview = {
      id: "guide-trip-overview",
      type: "trip_overview",
      content: guideProse.tripOverview,
      icon: "✈️",
    };
  } else {
    const cities = [
      ...new Set(
        days
          .map((d) => getCityFromDay(d))
          .filter((c) => c !== "generic"),
      ),
    ];

    const overviewTemplate = matchTripOverview(
      cities.length > 0 ? cities : ["generic"],
      season,
      "trip-overview",
    );

    overview = overviewTemplate
      ? {
          id: "guide-trip-overview",
          type: "trip_overview",
          content: overviewTemplate.content,
          icon: overviewTemplate.icon,
          templateId: overviewTemplate.id,
        }
      : undefined;
  }

  return {
    overview,
    days: dayGuides,
  };
}
