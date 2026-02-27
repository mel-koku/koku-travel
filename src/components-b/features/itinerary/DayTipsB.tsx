"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { ItineraryDay } from "@/types/itinerary";
import type { TravelGuidance } from "@/types/travelGuidance";
import { fetchDayGuidance, getCurrentSeason } from "@/lib/tips/guidanceService";
import { getRegionForCity } from "@/data/regions";
import { resolveActivityCategory } from "@/lib/guide/templateMatcher";

type DayTipsBProps = {
  day: ItineraryDay;
  tripStartDate?: string;
  dayIndex: number;
  className?: string;
};

type DisplayTip = {
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

export function DayTipsB({ day, tripStartDate, dayIndex, className }: DayTipsBProps) {
  const [dbTips, setDbTips] = useState<TravelGuidance[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
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

    // Count transit segments
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
          "A Suica or PASMO card works on trains, buses, and convenience stores across Japan. Load it at any station.",
        icon: "\uD83D\uDE83",
      });
    }

    // City transition day: luggage forwarding
    if (day.cityTransition) {
      tips.push({
        id: "pro-city-transition",
        title: "Send luggage ahead",
        summary:
          `Traveling to a new city today. Consider sending bags via takkyubin (luggage forwarding) from any convenience store or hotel.`,
        icon: "\uD83E\uDDF3",
      });
    }

    // Heavy transit day (3+ transit segments)
    if (transitSegments.length >= 3) {
      tips.push({
        id: "pro-heavy-transit",
        title: "Heavy transit day",
        summary:
          "You'll be using trains between most stops today. Keep your IC card handy and check platform signs for express vs local trains.",
        icon: "\uD83D\uDE89",
      });
    }

    // Rush hour warning: first activity departs 7:30-9:30
    const firstPlace = activities.find(
      (a) => a.kind === "place" && a.travelFromPrevious,
    );
    if (firstPlace?.kind === "place" && firstPlace.travelFromPrevious?.departureTime) {
      const depTime = firstPlace.travelFromPrevious.departureTime;
      const [h, m] = depTime.split(":").map(Number);
      if (h !== undefined && m !== undefined) {
        const depMinutes = h * 60 + m;
        if (depMinutes >= 450 && depMinutes <= 570) {
          // 7:30 to 9:30
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

    // Long Shinkansen segment (any travel > 60min by train)
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

    return tips;
  }, [dayIndex, day.activities, day.cityTransition]);

  const allTips = useMemo<DisplayTip[]>(
    () => [...proTips, ...dbTips.map(toDisplayTip)],
    [proTips, dbTips],
  );

  if (!isLoading && allTips.length === 0) return null;

  return (
    <div
      className={`overflow-hidden rounded-2xl ${className ?? ""}`}
      style={{
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-[var(--surface)]"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
            }}
          >
            <span className="text-sm">{"\uD83C\uDDEF\uD83C\uDDF5"}</span>
          </div>
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Travel Tips
          </span>
          {!isLoading && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{
                backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
                color: "var(--primary)",
              }}
            >
              {allTips.length}
            </span>
          )}
        </div>
        <ChevronDown
          className="h-4 w-4 transition-transform duration-200"
          style={{
            color: "var(--muted-foreground)",
            transform: isExpanded ? "rotate(180deg)" : undefined,
          }}
        />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div
              className="border-t px-4 pb-4"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="mt-3 space-y-2">
                {isLoading ? (
                  <p
                    className="py-2 text-center text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Loading tips...
                  </p>
                ) : (
                  allTips.map((tip) => (
                    <div
                      key={tip.id}
                      className="flex items-start gap-2.5 rounded-xl p-2.5"
                      style={{ backgroundColor: "var(--surface)" }}
                    >
                      <span className="shrink-0 text-base">{tip.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-xs font-semibold"
                          style={{ color: "var(--foreground)" }}
                        >
                          {tip.title}
                        </p>
                        <p
                          className="mt-0.5 text-xs leading-relaxed"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {tip.summary}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
