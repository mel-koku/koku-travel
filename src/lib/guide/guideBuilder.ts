/**
 * Guide Builder — Orchestrates building a TripGuide from an Itinerary.
 *
 * Pure function, runs in useMemo — no async, no API calls.
 * Takes itinerary data and produces guide segments (intros, transitions,
 * cultural moments, practical tips, summaries, and trip overview).
 */

import type { Itinerary, ItineraryActivity, ItineraryDay } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type {
  TripGuide,
  DayGuide,
  GuideSegment,
  ResolvedCategory,
} from "@/types/itineraryGuide";

import { DAY_INTRO_TEMPLATES } from "@/data/guide/dayIntros";
import { TRANSITION_TEMPLATES } from "@/data/guide/transitions";
import { CULTURAL_MOMENT_TEMPLATES } from "@/data/guide/culturalMoments";
import { PRACTICAL_TIP_TEMPLATES } from "@/data/guide/practicalTips";
import { DAY_SUMMARY_TEMPLATES } from "@/data/guide/daySummaries";
import { TRIP_OVERVIEW_TEMPLATES } from "@/data/guide/tripOverviews";

import {
  resolveActivityCategory,
  getSeason,
  getDayPosition,
  getTipTopicForDay,
  matchDayIntro,
  matchCulturalMoment,
  matchPracticalTip,
  matchDaySummary,
  matchTripOverview,
  initDayIntroIndex,
  initTransitionIndex,
  initCulturalMomentIndex,
  initPracticalTipIndex,
  initDaySummaryIndex,
  initTripOverviewIndex,
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

// Sub-categories that trigger cultural moments
const CULTURAL_SUBCATEGORIES = new Set([
  "shrine",
  "temple",
  "onsen",
  "market",
  "garden",
  "museum",
  "restaurant",
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
): GuideSegment {
  let content: string;

  if (activities.length > 0) {
    const opener = pickDayIntroOpener(city, `${dayId}-intro`);
    const listing = formatActivityList(activities);
    content = `${opener} Today takes you through ${listing}.`;

    // Optionally append first activity description if available
    const firstDesc = activities[0]?.description;
    if (firstDesc && activities.length <= 3) {
      // Truncate long descriptions
      const short = firstDesc.length > 120 ? firstDesc.slice(0, 117) + "..." : firstDesc;
      content += ` Starting with ${activities[0]!.title} — ${short.charAt(0).toLowerCase() + short.slice(1)}`;
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
): GuideSegment {
  const bridge = pickPhrase(
    TRANSITION_BRIDGES,
    `${dayId}-tr-${index}`,
    { name: nextActivity.title },
  );

  let content: string;
  if (nextActivity.description) {
    const desc = nextActivity.description;
    // Truncate long descriptions
    const short = desc.length > 150 ? desc.slice(0, 147) + "..." : desc;
    content = `${bridge} — ${short.charAt(0).toLowerCase() + short.slice(1)}`;
  } else {
    content = `${bridge}.`;
  }

  return {
    id: `guide-${dayId}-tr-${index}`,
    type: "activity_context",
    content,
    dayId,
    afterActivityId: prevActivity.id,
  };
}

function composeDaySummary(
  city: string,
  activities: PlaceActivity[],
  dayId: string,
): GuideSegment {
  let content: string;
  const displayCity = capitalize(city);

  if (activities.length >= 2) {
    const opener = pickPhrase(SUMMARY_OPENERS, `${dayId}-summary`, {
      city: displayCity,
    });
    const first = activities[0]!.title;
    const last = activities[activities.length - 1]!.title;
    content = `${opener} From ${first} to ${last}, you got a real taste of ${displayCity}. Rest up for tomorrow!`;
  } else if (activities.length === 1) {
    const opener = pickPhrase(SUMMARY_OPENERS, `${dayId}-summary`, {
      city: displayCity,
    });
    content = `${opener} ${activities[0]!.title} was a great way to spend the day in ${displayCity}. Rest up for tomorrow!`;
  } else {
    // Fallback to template when no activities
    const summaryTemplate = matchDaySummary(city, "mixed", `${dayId}-summary`);
    content = summaryTemplate?.content ?? `That's a wrap on ${displayCity}! Rest up for tomorrow.`;
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

  // ── Day Intro (composed from activity names) ──
  const position = getDayPosition(dayIndex, totalDays);
  const intro = composeDayIntro(city, activities, dayId, season, position);

  // ── Transitions + Cultural Moments ──
  let culturalMomentUsed = false;

  for (let i = 1; i < activities.length; i++) {
    const prevActivity = activities[i - 1]!;
    const currActivity = activities[i]!;
    const currResolved = resolved[i];

    // Transitions — composed from next activity name + description
    if (shouldShowTransition(i, activities.length)) {
      segments.push(
        composeTransition(prevActivity, currActivity, dayId, i),
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

  // ── Day Summary (composed from activity names) ──
  const summary = composeDaySummary(city, activities, dayId);

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
 */
export function buildGuide(
  itinerary: Itinerary,
  tripBuilderData?: TripBuilderData,
): TripGuide {
  ensureInitialized();

  const season = getSeason(tripBuilderData?.dates?.start);
  const days = itinerary.days ?? [];
  const totalDays = days.length;

  // Build per-day guides
  const dayGuides: DayGuide[] = days.map((day, index) =>
    buildDayGuide(day, index, totalDays, season),
  );

  // ── Trip Overview ──
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

  const overview: GuideSegment | undefined = overviewTemplate
    ? {
        id: "guide-trip-overview",
        type: "trip_overview",
        content: overviewTemplate.content,
        icon: overviewTemplate.icon,
        templateId: overviewTemplate.id,
      }
    : undefined;

  return {
    overview,
    days: dayGuides,
  };
}
