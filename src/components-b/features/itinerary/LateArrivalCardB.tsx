"use client";

import { Moon } from "lucide-react";
import { cn } from "@/lib/cn";

type LateArrivalCardBProps = {
  city: string;
  onDismiss: () => void;
  className?: string;
};

export function LateArrivalCardB({ city, onDismiss, className }: LateArrivalCardBProps) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-2xl p-4", className)}
      style={{
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          <Moon className="h-[18px] w-[18px]" style={{ color: "var(--primary)" }} />
        </div>
        <div className="min-w-0 flex-1">
          <h4
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            You get in late today
          </h4>
          <p
            className="mt-1 text-xs leading-relaxed"
            style={{ color: "var(--muted-foreground)" }}
          >
            Take it easy tonight and start fresh tomorrow — or we can suggest
            something open late in {city}.
          </p>
          <div className="mt-3">
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-xl px-3.5 py-1.5 text-xs font-medium transition-colors duration-200 hover:text-[var(--foreground)]"
              style={{
                color: "var(--muted-foreground)",
                backgroundColor: "var(--surface)",
              }}
            >
              Rest Tonight
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
