"use client";

import { useState, useEffect, useMemo } from "react";
import type { ItineraryDay } from "@/types/itinerary";
import type { TravelGuidance } from "@/types/travelGuidance";
import { fetchDayGuidance, getCurrentSeason } from "@/lib/tips/guidanceService";
import { getRegionForCity } from "@/data/regions";
import { resolveActivityCategory } from "@/lib/guide/templateMatcher";
import { LAST_TRAIN_TIMES, formatLastTrainTime } from "@/lib/constants/lastTrainTimes";
import { getFestivalsForDay } from "@/data/festivalCalendar";
import { getEkibenForCity } from "@/data/ekibenGuide";
import { getOmiyageForCity } from "@/data/omiyageGuide";
import { parseLocalDateWithOffset } from "@/lib/utils/dateUtils";

// Heuristic: if the day has these activity categories, tipGenerator will fire
// overlapping tips, so suppress the corresponding DB guidance types at day level
const CATEGORY_SUPPRESSES_GUIDANCE: Record<string, string[]> = {
  temple: ["etiquette"],
  shrine: ["etiquette"],
  onsen: ["etiquette"],
  restaurant: ["food_culture"],
  market: ["food_culture"],
  cafe: ["food_culture"],
};

export type DisplayTip = {
  id: string;
  title: string;
  summary: string;
  content?: string;
  icon: string;
  pillar?: string;
};

export const GUIDANCE_TYPE_ICONS: Record<string, string> = {
  etiquette: "\uD83D\uDE4F",
  practical: "\uD83D\uDCA1",
  environmental: "\uD83C\uDF3F",
  seasonal: "\uD83C\uDF38",
  accessibility: "\u267F",
  photography: "\uD83D\uDCF8",
  budget: "\uD83D\uDCB0",
  nightlife: "\uD83C\uDF19",
  family: "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67",
  solo: "\uD83C\uDF92",
  food_culture: "\uD83C\uDF5C",
  cultural_context: "\uD83D\uDCD6",
  transit: "\uD83D\uDE89",
};

const TRANSIT_MODES = new Set(["train", "subway", "bus", "tram", "ferry", "transit"]);

export function toDisplayTip(tip: TravelGuidance): DisplayTip {
  return {
    id: tip.id,
    title: tip.title,
    summary: tip.summary,
    content: tip.content,
    icon: tip.icon ?? GUIDANCE_TYPE_ICONS[tip.guidanceType] ?? "\uD83D\uDCA1",
  };
}

/** Keywords used to detect DB tips that overlap with hardcoded pro tips. */
export const PRO_TIP_DEDUP_KEYWORDS: Record<string, string[]> = {
  // Luggage forwarding
  "pro-city-transition": [
    "takkyubin", "luggage forwarding", "luggage delivery",
    "send luggage", "send bags", "ship luggage",
  ],
  // Last train
  "pro-last-train": ["last train", "shuden"],
  // Rail passes (DB tips about rail passes should still be suppressed)
  "pro-jr-pass": ["rail pass", "jr pass", "japan rail"],
  // Rush hour
  "pro-rush-hour-morning": ["rush hour", "crowded train", "avoid rush"],
  "pro-rush-hour-evening": ["rush hour", "crowded train", "avoid rush"],
};

/**
 * Keywords for tips that moved to trip-level. DB tips matching these
 * are suppressed unconditionally (not just when a matching pro tip fires).
 */
const TRIP_LEVEL_SUPPRESSION_KEYWORDS = [
  "ic card", "suica", "pasmo", "icoca", "mobile suica",
  "escalator", "stand on the left", "stand on the right",
  "golden week", "obon", "new year", "oshogatsu",
  "seasonal food", "seasonal dish", "what's in season",
  "goshuin", "stamp book", "temple stamp",
];

/** Festival dedup keywords (pro tip IDs are dynamic: pro-festival-{id}) */
const FESTIVAL_DEDUP_KEYWORDS = ["matsuri", "festival"];

export type UseDayTipsCoreOptions = {
  isFirstTimeVisitor?: boolean;
  /** When true, luggage smart prompt is active -- suppress the "Send luggage ahead" pro tip */
  hasLuggagePrompt?: boolean;
  /** DB tip IDs already surfaced as smart prompts -- suppress from day tips */
  surfacedGuidanceIds?: Set<string>;
  /** Tip IDs already shown on prior days -- used for cross-day dedup */
  previousDaysTipIds?: Set<string>;
};

export function useDayTipsCore(
  day: ItineraryDay,
  tripStartDate: string | undefined,
  dayIndex: number,
  options?: UseDayTipsCoreOptions,
): { proTips: DisplayTip[]; dbTips: DisplayTip[]; allTips: DisplayTip[]; isLoading: boolean } {
  const isFirstTimeVisitor = options?.isFirstTimeVisitor;
  const hasLuggagePrompt = options?.hasLuggagePrompt;
  const surfacedGuidanceIds = options?.surfacedGuidanceIds;
  const previousDaysTipIds = options?.previousDaysTipIds;
  const [rawDbTips, setRawDbTips] = useState<TravelGuidance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Extract unique location categories from the day's activities
  const dayCategories = useMemo(() => {
    const categories = new Set<string>();
    for (const activity of day.activities ?? []) {
      if (activity.kind === "place") {
        const resolved = resolveActivityCategory(activity.tags);
        if (resolved) categories.add(resolved.sub.toLowerCase());
      }
    }
    return Array.from(categories);
  }, [day.activities]);

  // Calculate the date for this day
  const dayDate = useMemo(() => {
    if (tripStartDate) {
      return parseLocalDateWithOffset(tripStartDate, dayIndex) ?? new Date();
    }
    return new Date();
  }, [tripStartDate, dayIndex]);

  const suppressGuidanceTypes = useMemo(() => {
    const types = new Set<string>();
    for (const cat of dayCategories) {
      const suppressed = CATEGORY_SUPPRESSES_GUIDANCE[cat];
      if (suppressed) {
        for (const t of suppressed) types.add(t);
      }
    }
    return Array.from(types);
  }, [dayCategories]);

  // Fetch day-level tips from DB
  useEffect(() => {
    let cancelled = false;
    async function loadTips() {
      setIsLoading(true);
      try {
        const regionId = day.cityId ? getRegionForCity(day.cityId) : undefined;
        const guidance = await fetchDayGuidance({
          categories: dayCategories,
          city: day.cityId,
          region: regionId,
          season: getCurrentSeason(dayDate),
          month: dayDate.getMonth() + 1,
          suppressGuidanceTypes,
        });
        if (!cancelled) {
          // Exclude tips already surfaced as smart prompts
          const pool = surfacedGuidanceIds?.size
            ? guidance.filter((tip) => !surfacedGuidanceIds.has(tip.id))
            : guidance;

          // Partition into scoped (has categories, cities, or regions) vs
          // unscoped (universal no-category). Scoped tips are more contextually
          // relevant and get priority. Unscoped tips backfill remaining slots.
          // Day 2+ gets max 0 unscoped; Day 1 gets max 2.
          const MAX_UNSCOPED = dayIndex === 0 ? 2 : 0;
          const MAX_DB_TIPS = 5;

          const isScoped = (tip: TravelGuidance) =>
            tip.categories.length > 0 ||
            tip.cities.length > 0 ||
            tip.regions.length > 0 ||
            tip.locationIds.length > 0;

          const scoped = pool.filter(isScoped);
          const unscoped = pool.filter((t) => !isScoped(t));

          const filtered = [
            ...scoped.slice(0, MAX_DB_TIPS),
            ...unscoped.slice(0, Math.min(MAX_UNSCOPED, MAX_DB_TIPS - Math.min(scoped.length, MAX_DB_TIPS))),
          ].slice(0, MAX_DB_TIPS);

          setRawDbTips(filtered);
        }
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadTips();
    return () => { cancelled = true; };
  }, [dayCategories, day.cityId, dayDate, dayIndex, suppressGuidanceTypes, surfacedGuidanceIds]);

  // Computed pro tips based on day data
  const proTips = useMemo<DisplayTip[]>(() => {
    const tips: DisplayTip[] = [];
    const activities = day.activities ?? [];

    const transitSegments = activities.filter(
      (a) =>
        a.kind === "place" &&
        a.travelFromPrevious &&
        TRANSIT_MODES.has(a.travelFromPrevious.mode),
    );

    // Day 1 only: Luggage drop-off tip when arriving at an airport
    if (dayIndex === 0) {
      const hasAirportAnchor = activities.some(
        (a) => a.kind === "place" && a.isAnchor && /airport/i.test(a.title),
      );
      if (hasAirportAnchor) {
        tips.push({
          id: "pro-luggage-dropoff",
          title: "Luggage drop-off",
          summary:
            "Most hotels accept luggage before check-in. You can also use coin lockers at major stations. Set your hotel as the start location above to route there first.",
          icon: "\uD83E\uDDF3",
        });
      }
    }

    // City transition day -- skip when luggage smart prompt is active (avoids duplication)
    if (day.cityTransition && !hasLuggagePrompt) {
      tips.push({
        id: "pro-city-transition",
        title: "Send luggage ahead",
        summary:
          "Traveling to a new city today. Consider sending bags via takkyubin (luggage forwarding) from any convenience store or hotel.",
        icon: "\uD83E\uDDF3",
      });
    }

    // Heavy transit day (3+ segments) -- scoped by city
    if (transitSegments.length >= 3) {
      const heavyTransitId = `pro-heavy-transit:${day.cityId ?? "unknown"}`;
      if (!previousDaysTipIds?.has(heavyTransitId)) {
        tips.push({
          id: heavyTransitId,
          title: "Heavy transit day",
          summary:
            "You'll be using trains between most stops today. Keep your IC card handy and check platform signs for express vs local trains.",
          icon: "\uD83D\uDE89",
        });
      }
    }

    // Rush hour warning -- scoped by city
    let hasMorningRush = false;
    let hasEveningRush = false;
    for (const a of activities) {
      if (a.kind !== "place") continue;
      const seg = a.travelFromPrevious;
      if (!seg?.departureTime || !TRANSIT_MODES.has(seg.mode)) continue;
      const [h, m] = seg.departureTime.split(":").map(Number);
      if (h === undefined || m === undefined) continue;
      const depMinutes = h * 60 + m;
      if (depMinutes >= 450 && depMinutes <= 570) hasMorningRush = true;
      if (depMinutes >= 1050 && depMinutes <= 1140) hasEveningRush = true;
    }
    if (hasMorningRush) {
      const rushMorningId = `pro-rush-hour-morning:${day.cityId ?? "unknown"}`;
      if (!previousDaysTipIds?.has(rushMorningId)) {
        tips.push({
          id: rushMorningId,
          title: "Morning rush hour",
          summary:
            "Expect crowded trains between 7:30 and 9:30. Stand to the side at platform doors and let passengers off first.",
          icon: "\u23F0",
        });
      }
    }
    if (hasEveningRush) {
      const rushEveningId = `pro-rush-hour-evening:${day.cityId ?? "unknown"}`;
      if (!previousDaysTipIds?.has(rushEveningId)) {
        tips.push({
          id: rushEveningId,
          title: "Evening rush hour",
          summary:
            "Trains get packed again between 17:30 and 19:00. Consider timing your travel just before or after this window.",
          icon: "\u23F0",
        });
      }
    }

    // Long train ride -- show once total (not city-scoped)
    const hasLongTrain = activities.some(
      (a) =>
        a.kind === "place" &&
        a.travelFromPrevious &&
        (a.travelFromPrevious.mode === "train" || a.travelFromPrevious.mode === "transit") &&
        a.travelFromPrevious.durationMinutes >= 60,
    );
    if (hasLongTrain && !previousDaysTipIds?.has("pro-shinkansen")) {
      tips.push({
        id: "pro-shinkansen",
        title: "Long train ride today",
        summary:
          "Book reserved seats on the Shinkansen if you haven't already. Oversized luggage needs a reservation for the last-row space.",
        icon: "\uD83D\uDE85",
      });
    }

    // Ekiben tip for long train rides -- scoped by city
    if (hasLongTrain && day.cityId) {
      const ekibenId = `pro-ekiben:${day.cityId}`;
      if (!previousDaysTipIds?.has(ekibenId)) {
        const ekiben = getEkibenForCity(day.cityId);
        if (ekiben.length > 0) {
          const top = ekiben.slice(0, 2);
          const names = top.map((e) => `${e.name} (${e.nameJa})`).join(", ");
          tips.push({
            id: ekibenId,
            title: "Grab an ekiben",
            summary: `Pick up a station bento before boarding: ${names}. Available at ${top[0]!.station} Station.`,
            icon: "\uD83C\uDF71",
          });
        }
      }
    }

    // Last train warning -- scoped by city
    if (day.cityId) {
      const lastTrainId = `pro-last-train:${day.cityId}`;
      if (!previousDaysTipIds?.has(lastTrainId)) {
        const lastTrainTime = LAST_TRAIN_TIMES[day.cityId];
        if (lastTrainTime) {
          const hasLateTransit = activities.some((a) => {
            if (a.kind !== "place") return false;
            const seg = a.travelToNext ?? a.travelFromPrevious;
            if (!seg?.departureTime) return false;
            const [dh, dm] = seg.departureTime.split(":").map(Number);
            if (dh === undefined || dm === undefined) return false;
            const depMin = dh * 60 + dm;
            return depMin > lastTrainTime - 30;
          });
          if (hasLateTransit) {
            tips.push({
              id: lastTrainId,
              title: `Last train from ${day.cityId.charAt(0).toUpperCase() + day.cityId.slice(1)}`,
              summary: `Last trains leave around ${formatLastTrainTime(lastTrainTime)}. Plan your evening around this or budget for a taxi.`,
              icon: "\uD83D\uDEA8",
            });
          }
        }
      }
    }

    // First-time visitor Day 1 orientation
    if (dayIndex === 0 && isFirstTimeVisitor) {
      tips.push({
        id: "pro-first-time-orientation",
        title: "Welcome to Japan",
        summary:
          "Pick up a pocket Wi-Fi or SIM at the airport, grab an IC card at the nearest station, and download Google Maps offline for your cities.",
        icon: "\u2708\uFE0F",
      });
    }

    // Omiyage tip -- on city transition days
    if (day.cityTransition && day.cityId) {
      const omiyage = getOmiyageForCity(day.cityId, 2);
      if (omiyage.length > 0) {
        const names = omiyage.map((o) => `${o.name} (${o.nameJa})`).join(", ");
        const cityLabel = day.cityId.charAt(0).toUpperCase() + day.cityId.slice(1);
        tips.push({
          id: "pro-omiyage",
          title: `${cityLabel} omiyage`,
          summary: `Last chance to grab souvenirs: ${names}. Available at ${omiyage[0]!.whereToBuy}.`,
          icon: "\uD83C\uDF81",
        });
      }
    }

    // Festival tip
    if (day.cityId) {
      const month = dayDate.getMonth() + 1;
      const dayOfMonth = dayDate.getDate();
      const festivals = getFestivalsForDay(month, dayOfMonth, day.cityId);
      if (festivals.length > 0) {
        const festival = festivals[0]!;
        const prefix = festival.isApproximate ? "Around this time: " : "";
        tips.push({
          id: `pro-festival-${festival.id}`,
          title: festival.name,
          summary: `${prefix}${festival.description}`,
          icon: "\uD83C\uDF86",
        });
      }
    }

    return tips;
  }, [dayIndex, day.activities, day.cityTransition, day.cityId, isFirstTimeVisitor, hasLuggagePrompt, dayDate, previousDaysTipIds]);

  // DB tips converted to DisplayTip format
  const dbTips = useMemo<DisplayTip[]>(() => rawDbTips.map(toDisplayTip), [rawDbTips]);

  // Combined display list -- dedup DB tips that overlap with active pro tips, cap total
  const MAX_TIPS_PER_DAY = 4;

  const allTips = useMemo<DisplayTip[]>(() => {
    const activeProIds = new Set(proTips.map((p) => p.id));
    const hasFestivalPro = [...activeProIds].some((id) => id.startsWith("pro-festival-"));

    const dedupedDb = rawDbTips.filter((tip) => {
      const titleLower = tip.title.toLowerCase();
      const summaryLower = tip.summary.toLowerCase();
      const text = `${titleLower} ${summaryLower}`;

      // Unconditional suppression: DB tips that overlap with trip-level content
      if (TRIP_LEVEL_SUPPRESSION_KEYWORDS.some((kw) => text.includes(kw))) {
        return false;
      }

      // Static keyword dedup: suppress DB tips that overlap with active pro tips.
      // Pro tip IDs may be city-scoped (e.g., "pro-rush-hour-morning:osaka"),
      // so match by prefix against PRO_TIP_DEDUP_KEYWORDS keys.
      for (const [proId, keywords] of Object.entries(PRO_TIP_DEDUP_KEYWORDS)) {
        const isActive = [...activeProIds].some((id) => id === proId || id.startsWith(`${proId}:`));
        if (!isActive) continue;
        if (keywords.some((kw) => text.includes(kw))) {
          return false;
        }
      }

      // Dynamic festival dedup: suppress DB tips about festivals when a festival pro tip fires
      if (hasFestivalPro && FESTIVAL_DEDUP_KEYWORDS.some((kw) => text.includes(kw))) {
        return false;
      }

      return true;
    });

    // Pro tips first (always win), then DB tips sorted by priority descending
    const sortedDb = dedupedDb
      .sort((a, b) => b.priority - a.priority)
      .map(toDisplayTip);

    return [...proTips, ...sortedDb].slice(0, MAX_TIPS_PER_DAY);
  }, [proTips, rawDbTips]);

  return { proTips, dbTips, allTips, isLoading };
}
