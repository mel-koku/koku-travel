"use client";

import { Moon } from "lucide-react";
import { cn } from "@/lib/cn";

type LateArrivalCardProps = {
  city: string;
  onDismiss: () => void;
  className?: string;
};

export function LateArrivalCard({ city, onDismiss, className }: LateArrivalCardProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-surface px-3 py-2",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Moon className="h-3.5 w-3.5 shrink-0 text-sage" />
          <p className="text-xs text-foreground-secondary">
            <span className="font-medium text-foreground">Late arrival.</span>
            {" "}Take it easy tonight in {city}.
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
