"use client";

import { cn } from "@/lib/utils";
import { typography } from "@/lib/typography-system";
import { Button } from "@/components/ui/Button";
import { formatCityName } from "@/lib/itinerary/dayLabel";

export type UnlockBeatProps = {
  /** City IDs (e.g. "tokyo"). Display names are resolved via formatCityName. */
  cities: string[];
  totalDays: number;
  priceLabel: string;
  /** When true, render a login CTA instead of the priced unlock CTA. Used
   *  during the free launch promo for guests who must sign in to claim. */
  loginRequired?: boolean;
  onUnlock: () => void;
};

export function UnlockBeat({
  cities,
  totalDays,
  priceLabel,
  loginRequired,
  onUnlock,
}: UnlockBeatProps) {
  const cityList = cities.slice(0, 3).map(formatCityName).join(", ");
  const overflow = cities.length > 3 ? ` + ${cities.length - 3} more` : "";

  return (
    <div data-beat="unlock" className="relative pl-[30px] pb-8">
      {/* Spine dot */}
      <span
        aria-hidden
        className="absolute left-[6px] top-[20px] h-[13px] w-[13px] rounded-full border-2 border-foreground bg-background"
      />

      {/* Card */}
      <div className="rounded-lg bg-surface shadow-[var(--shadow-card)] overflow-hidden">
        {/* Top accent strip */}
        <div className="h-1 bg-brand-primary" />

        <div className="px-6 py-6">
          <p className="eyebrow-editorial mb-2 text-brand-primary">The rest of your trip</p>
          <h3 className={cn(typography({ intent: "editorial-h2" }), "mb-2 leading-tight")}>
            {cityList}{overflow}
          </h3>
          <p className="text-sm text-foreground-body leading-relaxed max-w-[52ch] mb-6">
            {loginRequired
              ? `${totalDays - 1} more days, fully routed and scored. Trip Pass is free during our launch.`
              : `${totalDays - 1} more days, fully routed and scored. Day 1 is yours free. Unlock to see everything.`}
          </p>

          <div className="flex items-center gap-4 flex-wrap">
            <Button type="button" variant="primary" size="lg" onClick={onUnlock}>
              {loginRequired ? "Log in to see full itinerary" : `Unlock full trip · ${priceLabel}`}
            </Button>
          </div>

          {loginRequired && (
            <p className="mt-3 text-xs text-foreground-secondary">
              Sign in required to claim.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
