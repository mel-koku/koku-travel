"use client";

import { cn } from "@/lib/utils";
import { typography } from "@/lib/typography-system";

export type UnlockBeatProps = {
  cities: string[];
  totalDays: number;
  priceLabel: string;
  launchSlotsRemaining?: number;
  onUnlock: () => void;
};

export function UnlockBeat({
  cities,
  totalDays,
  priceLabel,
  launchSlotsRemaining,
  onUnlock,
}: UnlockBeatProps) {
  const cityList = cities.slice(0, 3).join(", ");
  return (
    <div
      data-beat="unlock"
      className="relative pl-[30px] pb-8"
    >
      <span
        aria-hidden
        className="absolute left-[6px] top-[8px] h-[13px] w-[13px] rounded-full border-2 border-foreground bg-background"
      />
      <div className="eyebrow-editorial mb-1">The rest of your trip</div>
      <h3 className={cn(typography({ intent: "editorial-h3" }), "mb-1")}>
        {cityList}
        {cities.length > 3 ? ` + ${cities.length - 3} more` : ""}
      </h3>
      <p className="text-sm text-foreground-body leading-relaxed max-w-[52ch] mb-3">
        {totalDays - 1} more days are ready. The routing, scoring, and Day 1 are yours. Unlock to reveal the rest.
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onUnlock}
          className="btn-yuku px-5 py-2.5 rounded-md text-sm font-medium"
        >
          Unlock full trip · {priceLabel}
        </button>
        {typeof launchSlotsRemaining === "number" && launchSlotsRemaining > 0 && (
          <span className="text-xs text-foreground-secondary">
            {launchSlotsRemaining} launch slots remaining
          </span>
        )}
      </div>
    </div>
  );
}
