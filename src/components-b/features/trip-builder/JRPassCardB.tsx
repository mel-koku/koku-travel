"use client";

import { useMemo } from "react";
import { Train, TrendingUp, TrendingDown } from "lucide-react";
import { calculatePassRecommendations, type JRPassRecommendation, type RegionalPassRecommendation } from "@/lib/tripBuilder/jrPassCalculator";
import type { CityId } from "@/types/trip";

type JRPassCardBProps = {
  duration?: number;
  cities?: CityId[];
};

function formatYen(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

function capitalizeCity(city: string): string {
  return city.charAt(0).toUpperCase() + city.slice(1);
}

export function JRPassCardB({ duration, cities }: JRPassCardBProps) {
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

  if (!recommendation && regionalPasses.length === 0) return null;

  const isSave = recommendation?.recommendation === "save";

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {recommendation && (
        <>
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                backgroundColor: isSave
                  ? "color-mix(in srgb, var(--success) 10%, transparent)"
                  : "var(--surface)",
              }}
            >
              <Train
                className="h-4 w-4"
                style={{ color: isSave ? "var(--success)" : "var(--muted-foreground)" }}
              />
            </div>
            <div>
              <h4 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                JR Pass
              </h4>
              <p
                className="text-[10px] uppercase tracking-[0.15em]"
                style={{ color: "var(--muted-foreground)" }}
              >
                {isSave ? "Recommended" : "Not worth it"}
              </p>
            </div>
            {isSave ? (
              <div className="ml-auto flex items-center gap-1" style={{ color: "var(--success)" }}>
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold">
                  Save {formatYen(recommendation.savings)}
                </span>
              </div>
            ) : (
              <div
                className="ml-auto flex items-center gap-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                <TrendingDown className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">No savings</span>
              </div>
            )}
          </div>

          <div className="mt-3 space-y-1">
            {recommendation.journeys.map((journey, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--muted-foreground)" }}>
                  {capitalizeCity(journey.from)} → {capitalizeCity(journey.to)}
                </span>
                <span className="font-mono" style={{ color: "var(--muted-foreground)" }}>
                  {formatYen(journey.fare)}
                </span>
              </div>
            ))}
            <div
              className="flex items-center justify-between border-t pt-1 text-xs"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="font-medium" style={{ color: "var(--foreground)" }}>
                Individual tickets
              </span>
              <span className="font-mono font-medium" style={{ color: "var(--foreground)" }}>
                {formatYen(recommendation.individualTotal)}
              </span>
            </div>
            {recommendation.passType && (
              <div className="flex items-center justify-between text-xs">
                <span
                  className="font-medium"
                  style={{ color: isSave ? "var(--success)" : "var(--foreground)" }}
                >
                  {recommendation.passType.name} JR Pass
                </span>
                <span
                  className="font-mono font-medium"
                  style={{ color: isSave ? "var(--success)" : "var(--foreground)" }}
                >
                  {formatYen(recommendation.passType.price)}
                </span>
              </div>
            )}
          </div>

          <p
            className="mt-2 text-[10px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            Prices are estimates. Verify at japanrailpass.net before purchasing.
          </p>
        </>
      )}

      {/* Regional Pass Recommendations */}
      {regionalPasses.length > 0 && (
        <div
          className="mt-3 border-t pt-3"
          style={{ borderColor: "var(--border)" }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--muted-foreground)" }}
          >
            Regional Passes
          </p>
          <div className="mt-1.5 space-y-1.5">
            {regionalPasses.map((rp) => (
              <div key={rp.pass.id} className="flex items-start justify-between text-xs">
                <div className="min-w-0 flex-1">
                  <span className="font-medium" style={{ color: "var(--muted-foreground)" }}>
                    {rp.pass.name}
                  </span>
                  {rp.pass.notes && (
                    <p className="mt-0.5 text-[10px] line-clamp-1" style={{ color: "var(--muted-foreground)" }}>
                      {rp.pass.notes}
                    </p>
                  )}
                </div>
                <span className="ml-2 shrink-0 font-mono" style={{ color: "var(--muted-foreground)" }}>
                  {formatYen(rp.pass.price)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
