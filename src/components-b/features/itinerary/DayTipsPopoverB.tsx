"use client";

import { useState, useEffect, useRef } from "react";
import type { ItineraryDay } from "@/types/itinerary";
import { useDayTips } from "./useDayTips";

type DayTipsPopoverBProps = {
  day: ItineraryDay;
  tripStartDate?: string;
  dayIndex: number;
};

export function DayTipsPopoverB({ day, tripStartDate, dayIndex }: DayTipsPopoverBProps) {
  const { tips, isLoading } = useDayTips(day, tripStartDate, dayIndex);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Click-outside close (desktop)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (isLoading || tips.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      {/* Trigger pill */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-semibold transition-colors active:scale-[0.98] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary)_16%,transparent)]"
        style={{ color: "var(--primary)" }}
        aria-label={`${tips.length} travel tips`}
      >
        <span className="text-xs">{"\uD83C\uDDEF\uD83C\uDDF5"}</span>
        <span>{tips.length}</span>
      </button>

      {/* Desktop popover (lg+) */}
      {open && (
        <>
          <div
            className="absolute right-0 top-full z-30 mt-1.5 hidden w-80 max-h-80 overflow-y-auto rounded-2xl border lg:block"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--card)",
              boxShadow: "var(--shadow-elevated)",
            }}
          >
            <PopoverContent tips={tips} />
          </div>

          {/* Mobile bottom sheet (<lg) */}
          <div
            className="fixed inset-0 z-30 lg:hidden"
            style={{ backgroundColor: "color-mix(in srgb, var(--charcoal) 50%, transparent)" }}
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-40 max-h-[60vh] overflow-y-auto rounded-t-2xl lg:hidden"
            style={{
              backgroundColor: "var(--card)",
              boxShadow: "var(--shadow-elevated)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div
                className="h-1 w-8 rounded-full"
                style={{ backgroundColor: "var(--border)" }}
              />
            </div>
            <div
              className="px-4 pb-2 text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Travel Tips
            </div>
            <PopoverContent tips={tips} />
          </div>
        </>
      )}
    </div>
  );
}

function PopoverContent({ tips }: { tips: { id: string; title: string; summary: string; icon: string }[] }) {
  return (
    <div className="p-3 space-y-1.5">
      {tips.map((tip) => (
        <div
          key={tip.id}
          className="flex items-start gap-2.5 rounded-xl p-2.5"
          style={{ backgroundColor: "var(--surface)" }}
        >
          <span className="shrink-0 text-base">{tip.icon}</span>
          <div className="min-w-0 flex-1">
            <p
              className="text-xs font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {tip.title}
            </p>
            <p
              className="mt-0.5 text-xs leading-relaxed"
              style={{ color: "var(--muted-foreground)" }}
            >
              {tip.summary}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
