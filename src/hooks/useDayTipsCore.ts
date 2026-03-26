"use client";

import { useState, useEffect, useMemo } from "react";
import type { ItineraryDay } from "@/types/itinerary";
import type { TravelGuidance } from "@/types/travelGuidance";
import { fetchDayGuidance, getCurrentSeason } from "@/lib/tips/guidanceService";
import { getRegionForCity } from "@/data/regions";
import { resolveActivityCategory } from "@/lib/guide/templateMatcher";
import { LAST_TRAIN_TIMES, formatLastTrainTime } from "@/lib/constants/lastTrainTimes";
import { getSeasonalFoods, formatSeasonalFoodTip } from "@/data/seasonalFoods";
import { getActiveHolidays } from "@/data/crowdPatterns";
import { getFestivalsForDay } from "@/data/festivalCalendar";
import { getEkibenForCity } from "@/data/ekibenGuide";
import { getOmiyageForCity } from "@/data/omiyageGuide";
import { parseLocalDateWithOffset } from "@/lib/utils/dateUtils";

export type DisplayTip = {
  id: string;
  title: string;
  summary: string;
  content?: string;
  icon: string;
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
  "pro-ic-card": ["ic card", "suica", "pasmo"],
  "pro-city-transition": ["takkyubin", "luggage forwarding"],
  "pro-last-train": ["last train"],
  "pro-jr-pass": ["rail pass", "jr pass", "japan rail"],
};

export type UseDayTipsCoreOptions = {
  nextDayActivities?: ItineraryDay["activities"];
  isFirstTimeVisitor?: boolean;
  /** When true, luggage smart prompt is active -- suppress the "Send luggage ahead" pro tip */
  hasLuggagePrompt?: boolean;
};

export function useDayTipsCore(
  day: ItineraryDay,
  tripStartDate: string | undefined,
  dayIndex: number,
  options?: UseDayTipsCoreOptions,
): { proTips: DisplayTip[]; dbTips: DisplayTip[]; allTips: DisplayTip[]; isLoading: boolean } {
  const nextDayActivities = options?.nextDayActivities;
  const isFirstTimeVisitor = options?.isFirstTimeVisitor;
  const hasLuggagePrompt = options?.hasLuggagePrompt;
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
        });
        if (!cancelled) {
          // On Day 2+, filter out truly-universal tips (no city/region/category
          // scope) to prevent the same generic tips from repeating every day.
          // Safety-critical tips still show on Day 1.
          let filtered = guidance;
          if (dayIndex > 0) {
            filtered = guidance.filter(
              (tip) =>
                tip.categories.length > 0 ||
                tip.cities.length > 0 ||
                tip.regions.length > 0 ||
                tip.locationIds.length > 0,
            );
          }
          // Limit to top 5 tips for the day
          setRawDbTips(filtered.slice(0, 5));
        }
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadTips();
    return () => { cancelled = true; };
  }, [dayCategories, day.cityId, dayDate, dayIndex]);

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
    const hasTransit = transitSegments.length > 0;

    // Day 1 only: IC Card tip
    if (dayIndex === 0 && hasTransit) {
      tips.push({
        id: "pro-ic-card",
        title: "Get an IC Card",
        summary:
          "Get an IC card (Suica, PASMO, ICOCA, or any regional card) at any station. They all work nationwide on trains, buses, and convenience stores.",
        icon: "\uD83D\uDE83",
      });
    }

    // Day 1: JR Pass / transit pass tip for multi-city trips
    if (dayIndex === 0) {
      const hasCityTransition = day.cityTransition;
      if (hasCityTransition || hasTransit) {
        tips.push({
          id: "pro-jr-pass",
          title: "Consider a rail pass",
          summary:
            "Multi-city trips often save money with a Japan Rail Pass or regional pass (Kansai Area Pass, Hokkaido Pass). Compare pass cost vs individual tickets before your trip.",
          icon: "\uD83C\uDFAB",
        });
      }
    }

    // Day 1: Escalator convention
    if (dayIndex === 0 && hasTransit) {
      tips.push({
        id: "pro-escalator",
        title: "Escalator etiquette",
        summary:
          "Stand on the left in Tokyo (right in Osaka/Kyoto). Keep the other side clear for people walking past.",
        icon: "\uD83D\uDEB6",
      });
    }

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

    // Heavy transit day (3+ segments)
    if (transitSegments.length >= 3) {
      tips.push({
        id: "pro-heavy-transit",
        title: "Heavy transit day",
        summary:
          "You'll be using trains between most stops today. Keep your IC card handy and check platform signs for express vs local trains.",
        icon: "\uD83D\uDE89",
      });
    }

    // Rush hour warning
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
      tips.push({
        id: "pro-rush-hour-morning",
        title: "Morning rush hour",
        summary:
          "Expect crowded trains between 7:30 and 9:30. Stand to the side at platform doors and let passengers off first.",
        icon: "\u23F0",
      });
    }
    if (hasEveningRush) {
      tips.push({
        id: "pro-rush-hour-evening",
        title: "Evening rush hour",
        summary:
          "Trains get packed again between 17:30 and 19:00. Consider timing your travel just before or after this window.",
        icon: "\u23F0",
      });
    }

    // Long train ride
    const hasLongTrain = activities.some(
      (a) =>
        a.kind === "place" &&
        a.travelFromPrevious &&
        (a.travelFromPrevious.mode === "train" || a.travelFromPrevious.mode === "transit") &&
        a.travelFromPrevious.durationMinutes >= 60,
    );
    if (hasLongTrain) {
      tips.push({
        id: "pro-shinkansen",
        title: "Long train ride today",
        summary:
          "Book reserved seats on the Shinkansen if you haven't already. Oversized luggage needs a reservation for the last-row space.",
        icon: "\uD83D\uDE85",
      });

      // Ekiben tip for long train rides
      if (day.cityId) {
        const ekiben = getEkibenForCity(day.cityId);
        if (ekiben.length > 0) {
          const top = ekiben.slice(0, 2);
          const names = top.map((e) => `${e.name} (${e.nameJa})`).join(", ");
          tips.push({
            id: "pro-ekiben",
            title: "Grab an ekiben",
            summary: `Pick up a station bento before boarding: ${names}. Available at ${top[0]!.station} Station.`,
            icon: "\uD83C\uDF71",
          });
        }
      }
    }

    // Last train warning
    if (day.cityId) {
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
            id: "pro-last-train",
            title: `Last train from ${day.cityId.charAt(0).toUpperCase() + day.cityId.slice(1)}`,
            summary: `Last trains leave around ${formatLastTrainTime(lastTrainTime)}. Plan your evening around this or budget for a taxi.`,
            icon: "\uD83D\uDEA8",
          });
        }
      }
    }

    // Cash-only warning for next day
    if (nextDayActivities) {
      const cashOnlyNames = nextDayActivities
        .filter((a) => a.kind === "place" && a.tags?.includes("cash-only"))
        .map((a) => a.title);
      if (cashOnlyNames.length > 0) {
        const names = cashOnlyNames.length <= 2
          ? cashOnlyNames.join(" and ")
          : `${cashOnlyNames.length} spots`;
        tips.push({
          id: "pro-cash-tomorrow",
          title: "Withdraw cash tonight",
          summary: `Tomorrow: ${names} ${cashOnlyNames.length === 1 ? "is" : "are"} cash-only. Find a 7-Eleven ATM (international cards accepted 24/7).`,
          icon: "\uD83D\uDCB4",
        });
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

    // Seasonal food tip
    const month = dayDate.getMonth() + 1;
    const hasRestaurant = dayCategories.some((c) => ["restaurant", "cafe", "market"].includes(c));
    if (hasRestaurant && day.cityId) {
      const seasonalFoods = getSeasonalFoods(month, day.cityId);
      if (seasonalFoods.length > 0) {
        const foodText = formatSeasonalFoodTip(seasonalFoods.slice(0, 3));
        tips.push({
          id: "pro-seasonal-food",
          title: "What's in season",
          summary: `Try local seasonal picks: ${foodText}`,
          icon: "\uD83C\uDF7D\uFE0F",
        });
      }
    }

    // Holiday crowd warning -- show on all days (not just Day 1)
    {
      const dayOfMonth = dayDate.getDate();
      const holidays = getActiveHolidays(month, dayOfMonth, month, dayOfMonth);
      if (holidays.length > 0) {
        const holiday = holidays[0]!;
        tips.push({
          id: "pro-holiday-crowd",
          title: holiday.name,
          summary: holiday.description,
          icon: "\uD83C\uDFEE",
        });
      }
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

    // Goshuin etiquette tip -- Day 1 when itinerary has temples/shrines
    if (dayIndex === 0 && (dayCategories.includes("temple") || dayCategories.includes("shrine"))) {
      tips.push({
        id: "pro-goshuin-etiquette",
        title: "Goshuin etiquette",
        summary: "Bring a goshuincho (stamp book) to collect temple and shrine seals. Present it open to the correct page, pay \u00A5300-500, and wait quietly. Keep temple stamps separate from tourist stamps, as some temples may decline a mixed book.",
        icon: "\u26E9\uFE0F",
      });
    }

    // Festival tip
    if (day.cityId) {
      const dayOfMonth = dayDate.getDate();
      const festivals = getFestivalsForDay(month, dayOfMonth, day.cityId);
      if (festivals.length > 0) {
        const festival = festivals[0]!;
        tips.push({
          id: `pro-festival-${festival.id}`,
          title: festival.name,
          summary: festival.description,
          icon: "\uD83C\uDF86",
        });
      }
    }

    return tips;
  }, [dayIndex, day.activities, day.cityTransition, day.cityId, nextDayActivities, isFirstTimeVisitor, hasLuggagePrompt, dayDate, dayCategories]);

  // DB tips converted to DisplayTip format
  const dbTips = useMemo<DisplayTip[]>(() => rawDbTips.map(toDisplayTip), [rawDbTips]);

  // Combined display list -- dedup DB tips that overlap with active pro tips
  const allTips = useMemo<DisplayTip[]>(() => {
    const activeProIds = new Set(proTips.map((p) => p.id));
    const dedupedDb = rawDbTips.filter((tip) => {
      const titleLower = tip.title.toLowerCase();
      const summaryLower = tip.summary.toLowerCase();
      for (const [proId, keywords] of Object.entries(PRO_TIP_DEDUP_KEYWORDS)) {
        if (!activeProIds.has(proId)) continue;
        if (keywords.some((kw) => titleLower.includes(kw) || summaryLower.includes(kw))) {
          return false;
        }
      }
      return true;
    });
    return [...proTips, ...dedupedDb.map(toDisplayTip)];
  }, [proTips, rawDbTips]);

  return { proTips, dbTips, allTips, isLoading };
}
