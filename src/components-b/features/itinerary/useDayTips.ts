"use client";

import { useState, useEffect, useMemo } from "react";
import type { ItineraryDay } from "@/types/itinerary";
import type { TravelGuidance } from "@/types/travelGuidance";
import { fetchDayGuidance, getCurrentSeason } from "@/lib/tips/guidanceService";
import { getRegionForCity } from "@/data/regions";
import { resolveActivityCategory } from "@/lib/guide/templateMatcher";
import { LAST_TRAIN_TIMES, formatLastTrainTime } from "@/lib/constants/lastTrainTimes";

export type DisplayTip = {
  id: string;
  title: string;
  summary: string;
  icon: string;
};

const GUIDANCE_TYPE_ICONS: Record<string, string> = {
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

function toDisplayTip(tip: TravelGuidance): DisplayTip {
  return {
    id: tip.id,
    title: tip.title,
    summary: tip.summary,
    icon: tip.icon ?? GUIDANCE_TYPE_ICONS[tip.guidanceType] ?? "\uD83D\uDCA1",
  };
}

export function useDayTips(
  day: ItineraryDay,
  tripStartDate: string | undefined,
  dayIndex: number,
  options?: {
    nextDayActivities?: ItineraryDay["activities"];
    isFirstTimeVisitor?: boolean;
  },
): { tips: DisplayTip[]; isLoading: boolean } {
  const nextDayActivities = options?.nextDayActivities;
  const isFirstTimeVisitor = options?.isFirstTimeVisitor;
  const [dbTips, setDbTips] = useState<TravelGuidance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const dayDate = useMemo(() => {
    if (tripStartDate) {
      try {
        const [year, month, dayNum] = tripStartDate.split("-").map(Number);
        if (year && month && dayNum) {
          const startDate = new Date(year, month - 1, dayNum);
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + dayIndex);
          return date;
        }
      } catch {
        // Invalid date
      }
    }
    return new Date();
  }, [tripStartDate, dayIndex]);

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
          setDbTips(filtered.slice(0, 5));
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

    if (dayIndex === 0 && hasTransit) {
      tips.push({
        id: "pro-ic-card",
        title: "Get an IC Card",
        summary:
          "A Suica or PASMO card works on trains, buses, and convenience stores across Japan. Load it at any station.",
        icon: "\uD83D\uDE83",
      });
    }

    if (day.cityTransition) {
      tips.push({
        id: "pro-city-transition",
        title: "Send luggage ahead",
        summary:
          "Traveling to a new city today. Consider sending bags via takkyubin (luggage forwarding) from any convenience store or hotel.",
        icon: "\uD83E\uDDF3",
      });
    }

    if (transitSegments.length >= 3) {
      tips.push({
        id: "pro-heavy-transit",
        title: "Heavy transit day",
        summary:
          "You'll be using trains between most stops today. Keep your IC card handy and check platform signs for express vs local trains.",
        icon: "\uD83D\uDE89",
      });
    }

    const firstPlace = activities.find(
      (a) => a.kind === "place" && a.travelFromPrevious,
    );
    if (firstPlace?.kind === "place" && firstPlace.travelFromPrevious?.departureTime) {
      const depTime = firstPlace.travelFromPrevious.departureTime;
      const [h, m] = depTime.split(":").map(Number);
      if (h !== undefined && m !== undefined) {
        const depMinutes = h * 60 + m;
        if (depMinutes >= 450 && depMinutes <= 570) {
          tips.push({
            id: "pro-rush-hour",
            title: "Morning rush hour",
            summary:
              "Early start today — expect crowded trains between 7:30 and 9:30. Stand to the side at platform doors and let passengers off first.",
            icon: "\u23F0",
          });
        }
      }
    }

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

    return tips;
  }, [dayIndex, day.activities, day.cityTransition, day.cityId, nextDayActivities, isFirstTimeVisitor]);

  const allTips = useMemo<DisplayTip[]>(
    () => [...proTips, ...dbTips.map(toDisplayTip)],
    [proTips, dbTips],
  );

  return { tips: allTips, isLoading };
}
