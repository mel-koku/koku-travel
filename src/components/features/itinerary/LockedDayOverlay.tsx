"use client";

import { cn } from "@/lib/utils";
import { typography } from "@/lib/typography-system";

type LockedDayOverlayProps = {
  onUnlockClick: () => void;
};

export function LockedDayOverlay({ onUnlockClick }: LockedDayOverlayProps) {
  return (
    <div className="pointer-events-none relative">
      {/* Blur filter over the activity content */}
      <div className="absolute inset-0 z-10 backdrop-blur-md bg-background/40" />

      {/* Centered unlock prompt */}
      <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center">
        <button
          onClick={onUnlockClick}
          aria-label="Unlock full itinerary for this day"
          className="rounded-lg bg-surface px-6 py-3 shadow-[var(--shadow-elevated)] transition-shadow hover:shadow-[var(--shadow-glow)]"
        >
          <p className={cn(typography({ intent: "utility-label" }), "text-brand-primary")}>
            Unlock to see this day
          </p>
        </button>
      </div>
    </div>
  );
}
