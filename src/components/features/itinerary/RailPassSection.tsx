"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Train } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  calculatePassRecommendations,
  type RegionalPassRecommendation,
} from "@/lib/railPass/jrPassCalculator";
import type { Itinerary } from "@/types/itinerary";
import { buildDayLabel, formatCityName } from "@/lib/itinerary/dayLabel";

type CityTransition = {
  fromCityId: string;
  toCityId: string;
  dayIndex: number;
};

/**
 * Extract city transitions from itinerary days.
 * Returns the day index where each city-to-city move happens,
 * plus a deduplicated ordered city list for the calculator.
 */
function extractCityData(itinerary: Itinerary) {
  const days = itinerary.days;
  if (days.length === 0) return { transitions: [], orderedCities: [] };

  const transitions: CityTransition[] = [];
  const orderedCities: string[] = [];
  let prevCityId: string | undefined;

  for (let i = 0; i < days.length; i++) {
    const cityId = days[i]!.cityId;
    if (!cityId) continue;

    if (cityId !== prevCityId) {
      if (prevCityId) {
        transitions.push({
          fromCityId: prevCityId,
          toCityId: cityId,
          dayIndex: i,
        });
      }
      orderedCities.push(cityId);
      prevCityId = cityId;
    }
  }

  return { transitions, orderedCities };
}

/**
 * Find which itinerary days a regional pass covers.
 */
function getPassDayCoverage(
  pass: RegionalPassRecommendation,
  itinerary: Itinerary,
): { dayRange: string; cities: string[] } {
  const coverageSet = new Set<string>(pass.coveredCities);
  const coveredDayIndices: number[] = [];
  const coveredCityNames: string[] = [];
  const seenCities = new Set<string>();

  for (let i = 0; i < itinerary.days.length; i++) {
    const cityId = itinerary.days[i]!.cityId;
    if (cityId && coverageSet.has(cityId)) {
      coveredDayIndices.push(i);
      if (!seenCities.has(cityId)) {
        seenCities.add(cityId);
        coveredCityNames.push(formatCityName(cityId));
      }
    }
  }

  if (coveredDayIndices.length === 0) {
    return { dayRange: "", cities: [] };
  }

  const first = coveredDayIndices[0]!;
  const last = coveredDayIndices[coveredDayIndices.length - 1]!;
  const dayRange =
    first === last
      ? `Day ${first + 1}`
      : `Days ${first + 1}\u2013${last + 1}`;

  return { dayRange, cities: coveredCityNames };
}

function formatYen(amount: number): string {
  return `\u00A5${amount.toLocaleString()}`;
}

type RailPassSectionProps = {
  itinerary: Itinerary;
  tripStartDate?: string;
};

export function RailPassSection({ itinerary, tripStartDate }: RailPassSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { recommendation, regionalPasses, transitions } = useMemo(() => {
    const { transitions: trans, orderedCities } = extractCityData(itinerary);
    const duration = itinerary.days.length;

    if (orderedCities.length < 2 || duration < 3) {
      return { recommendation: null, regionalPasses: [], transitions: [] };
    }

    const result = calculatePassRecommendations(duration, orderedCities);

    if (result.jrPass.journeys.length === 0 && result.regionalPasses.length === 0) {
      return { recommendation: null, regionalPasses: [], transitions: [] };
    }

    return {
      recommendation: result.jrPass.journeys.length > 0 ? result.jrPass : null,
      regionalPasses: result.regionalPasses,
      transitions: trans,
    };
  }, [itinerary]);

  // Map journey legs to day indices via transitions
  const journeyDayMap = useMemo(() => {
    if (!recommendation) return new Map<number, number>();
    const map = new Map<number, number>();
    for (let i = 0; i < recommendation.journeys.length; i++) {
      const journey = recommendation.journeys[i]!;
      const transition = transitions.find(
        (t) => t.fromCityId === journey.from && t.toCityId === journey.to,
      );
      if (transition) {
        map.set(i, transition.dayIndex);
      }
    }
    return map;
  }, [recommendation, transitions]);

  if (!recommendation && regionalPasses.length === 0) return null;

  const isSave = recommendation?.recommendation === "save";

  return (
    <div className="space-y-2">
      <h3 className="eyebrow-editorial">Rail Pass</h3>
      <div className="rounded-lg border border-border bg-surface/30">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-surface/50 transition"
        >
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
              isSave ? "bg-sage/10" : "bg-background",
            )}
          >
            <Train className={cn("h-3.5 w-3.5", isSave ? "text-sage" : "text-stone")} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm text-foreground">JR Pass</span>
            {recommendation && (
              <span
                className={cn(
                  "ml-2 text-xs",
                  isSave ? "text-sage font-medium" : "text-stone",
                )}
              >
                {isSave
                  ? `Save ${formatYen(recommendation.savings)}`
                  : "Individual tickets cheaper"}
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-stone transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </button>

        {isOpen && (
          <div className="border-t border-border/50 px-4 pb-4 pt-3">
            {recommendation && (
              <>
                {/* Journey breakdown with day labels */}
                <div className="space-y-1">
                  {recommendation.journeys.map((journey, i) => {
                    const dayIndex = journeyDayMap.get(i);
                    const dayLabel =
                      dayIndex !== undefined && tripStartDate
                        ? `Day ${dayIndex + 1} \u00B7 ${buildDayLabel(dayIndex, { tripStartDate }).split(" \u00B7 ")[0]}`
                        : dayIndex !== undefined
                          ? `Day ${dayIndex + 1}`
                          : null;

                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-foreground-secondary">
                          {dayLabel && (
                            <span className="text-stone mr-1.5">{dayLabel}</span>
                          )}
                          {formatCityName(journey.from)} \u2192 {formatCityName(journey.to)}
                        </span>
                        <span className="font-mono text-foreground-secondary">
                          {formatYen(journey.fare)}
                        </span>
                      </div>
                    );
                  })}

                  <div className="flex items-center justify-between border-t border-border/50 pt-1 text-xs">
                    <span className="font-medium text-foreground">Individual tickets</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatYen(recommendation.individualTotal)}
                    </span>
                  </div>

                  {recommendation.passType && (
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={cn(
                          "font-medium",
                          isSave ? "text-sage" : "text-foreground",
                        )}
                      >
                        {recommendation.passType.name} JR Pass
                      </span>
                      <span
                        className={cn(
                          "font-mono font-medium",
                          isSave ? "text-sage" : "text-foreground",
                        )}
                      >
                        {formatYen(recommendation.passType.price)}
                      </span>
                    </div>
                  )}
                </div>

                <p className="mt-2 text-[10px] text-stone">
                  Prices are estimates. Verify at japanrailpass.net before purchasing.
                </p>
              </>
            )}

            {/* Regional Pass Recommendations */}
            {regionalPasses.length > 0 && (
              <div className={cn(recommendation && "mt-3 border-t border-border/50 pt-3")}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone">
                  Regional Passes
                </p>
                <div className="mt-1.5 space-y-2">
                  {regionalPasses.map((rp) => {
                    const coverage = getPassDayCoverage(rp, itinerary);
                    return (
                      <div key={rp.pass.id} className="text-xs">
                        <div className="flex items-start justify-between">
                          <span className="font-medium text-foreground-secondary">
                            {rp.pass.name}
                          </span>
                          <span className="ml-2 shrink-0 font-mono text-foreground-secondary">
                            {formatYen(rp.pass.price)}
                          </span>
                        </div>
                        {coverage.cities.length > 0 && (
                          <p className="mt-0.5 text-[10px] text-stone">
                            Covers {coverage.dayRange}: {coverage.cities.join(", ")}
                          </p>
                        )}
                        {rp.pass.notes && !coverage.cities.length && (
                          <p className="mt-0.5 text-[10px] text-stone line-clamp-1">
                            {rp.pass.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
