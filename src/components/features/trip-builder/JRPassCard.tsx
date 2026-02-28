"use client";

import { useMemo } from "react";
import { Train, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { calculateJRPassValue, type JRPassRecommendation } from "@/lib/tripBuilder/jrPassCalculator";
import type { CityId } from "@/types/trip";

type JRPassCardProps = {
  duration?: number;
  cities?: CityId[];
};

function formatYen(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

function capitalizeCity(city: string): string {
  return city.charAt(0).toUpperCase() + city.slice(1);
}

export function JRPassCard({ duration, cities }: JRPassCardProps) {
  const recommendation = useMemo<JRPassRecommendation | null>(() => {
    if (!cities || cities.length < 2 || !duration || duration < 3) return null;
    const result = calculateJRPassValue(duration, cities);
    // Don't show if no journeys have fares
    if (result.journeys.length === 0) return null;
    return result;
  }, [duration, cities]);

  if (!recommendation) return null;

  const isSave = recommendation.recommendation === "save";

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          isSave ? "bg-sage/10" : "bg-surface"
        )}>
          <Train className={cn("h-4 w-4", isSave ? "text-sage" : "text-stone")} />
        </div>
        <div>
          <h4 className="text-sm font-medium text-foreground">JR Pass</h4>
          <p className="text-[10px] uppercase tracking-[0.15em] text-stone">
            {isSave ? "Recommended" : "Not worth it"}
          </p>
        </div>
        {isSave ? (
          <div className="ml-auto flex items-center gap-1 text-sage">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">Save {formatYen(recommendation.savings)}</span>
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-1 text-stone">
            <TrendingDown className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">No savings</span>
          </div>
        )}
      </div>

      {/* Journey breakdown */}
      <div className="mt-3 space-y-1">
        {recommendation.journeys.map((journey, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-foreground-secondary">
              {capitalizeCity(journey.from)} → {capitalizeCity(journey.to)}
            </span>
            <span className="font-mono text-foreground-secondary">
              {formatYen(journey.fare)}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-1 text-xs">
          <span className="font-medium text-foreground">Individual tickets</span>
          <span className="font-mono font-medium text-foreground">
            {formatYen(recommendation.individualTotal)}
          </span>
        </div>
        {recommendation.passType && (
          <div className="flex items-center justify-between text-xs">
            <span className={cn("font-medium", isSave ? "text-sage" : "text-foreground")}>
              {recommendation.passType.name} JR Pass
            </span>
            <span className={cn("font-mono font-medium", isSave ? "text-sage" : "text-foreground")}>
              {formatYen(recommendation.passType.price)}
            </span>
          </div>
        )}
      </div>

      <p className="mt-2 text-[10px] text-stone">
        Prices are estimates. Verify at japanrailpass.net before purchasing.
      </p>
    </div>
  );
}
