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
        "rounded-xl border border-border bg-surface p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage/10">
          <Moon className="h-5 w-5 text-sage" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-foreground">
            You get in late today
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-stone">
            Take it easy tonight and start fresh tomorrow — or we can suggest
            something open late in {city}.
          </p>
          <div className="mt-3">
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-xl bg-surface px-3.5 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-border hover:text-foreground"
            >
              Rest Tonight
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
