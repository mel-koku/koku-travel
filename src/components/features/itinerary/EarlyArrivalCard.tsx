"use client";

import { Sunrise } from "lucide-react";
import { cn } from "@/lib/cn";

type EarlyArrivalCardProps = {
  city: string;
  onDismiss: () => void;
  className?: string;
};

export function EarlyArrivalCard({ city, onDismiss, className }: EarlyArrivalCardProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-surface px-3 py-2",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sunrise className="h-3.5 w-3.5 shrink-0 text-sage" />
          <p className="text-xs text-foreground-secondary">
            <span className="font-medium text-foreground">Pre-dawn arrival.</span>
            {" "}Settle in first. Most things in {city} open from 09:00.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium text-stone transition-colors hover:bg-border hover:text-foreground"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
