"use client";

import { useMemo, useState } from "react";
import { Train, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { calculatePassRecommendations, type JRPassRecommendation, type RegionalPassRecommendation } from "@/lib/tripBuilder/jrPassCalculator";
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
  const { recommendation, regionalPasses } = useMemo<{
    recommendation: JRPassRecommendation | null;
    regionalPasses: RegionalPassRecommendation[];
  }>(() => {
    if (!cities || cities.length < 2 || !duration || duration < 3)
      return { recommendation: null, regionalPasses: [] };
    const result = calculatePassRecommendations(duration, cities);
    if (result.jrPass.journeys.length === 0)
      return { recommendation: null, regionalPasses: result.regionalPasses };
    return { recommendation: result.jrPass, regionalPasses: result.regionalPasses };
  }, [duration, cities]);

  const [isOpen, setIsOpen] = useState(false);

  if (!recommendation && regionalPasses.length === 0) return null;

  const isSave = recommendation?.recommendation === "save";

  return (
    <div className="rounded-xl border border-border bg-surface">
      {/* Summary row (always visible) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 p-4 text-left"
      >
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isSave ? "bg-sage/10" : "bg-background"
        )}>
          <Train className={cn("h-4 w-4", isSave ? "text-sage" : "text-stone")} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-foreground">JR Pass</h4>
          {recommendation && (
            <p className={cn(
              "text-xs",
              isSave ? "text-sage font-medium" : "text-stone"
            )}>
              {isSave
                ? `Save ${formatYen(recommendation.savings)} vs individual tickets`
                : "Individual tickets are cheaper for this route"}
            </p>
          )}
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 shrink-0 text-stone transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Collapsible details */}
      {isOpen && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {recommendation && (
            <>
              {/* Journey breakdown */}
              <div className="space-y-1">
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
            </>
          )}

          {/* Regional Pass Recommendations */}
          {regionalPasses.length > 0 && (
            <div className={cn(recommendation && "mt-3 border-t border-border pt-3")}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone">
                Regional Passes
              </p>
              <div className="mt-1.5 space-y-1.5">
                {regionalPasses.map((rp) => (
                  <div key={rp.pass.id} className="flex items-start justify-between text-xs">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-foreground-secondary">
                        {rp.pass.name}
                      </span>
                      {rp.pass.notes && (
                        <p className="mt-0.5 text-[10px] text-stone line-clamp-1">{rp.pass.notes}</p>
                      )}
                    </div>
                    <span className="ml-2 shrink-0 font-mono text-foreground-secondary">
                      {formatYen(rp.pass.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
