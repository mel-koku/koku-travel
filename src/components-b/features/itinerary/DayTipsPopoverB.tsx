"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import type { ItineraryDay } from "@/types/itinerary";
import { useDayTips } from "./useDayTips";

type DayTipsPopoverBProps = {
  day: ItineraryDay;
  tripStartDate?: string;
  dayIndex: number;
  nextDayActivities?: ItineraryDay["activities"];
  isFirstTimeVisitor?: boolean;
};

export function DayTipsPopoverB({ day, tripStartDate, dayIndex, nextDayActivities, isFirstTimeVisitor }: DayTipsPopoverBProps) {
  const { tips, isLoading } = useDayTips(day, tripStartDate, dayIndex, { nextDayActivities, isFirstTimeVisitor });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  // Position the fixed popover relative to the trigger button
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPopoverStyle({
      position: "fixed",
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
      zIndex: 50,
    });
  }, []);

  // Click-outside close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        ref.current && !ref.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  if (isLoading || tips.length === 0) return null;

  const popoverContent = (
    <>
      {/* Desktop popover (lg+) — portaled to body */}
      <div
        ref={popoverRef}
        className="hidden w-80 max-h-80 overflow-y-auto rounded-2xl border lg:block"
        style={{
          ...popoverStyle,
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
  );

  return (
    <div ref={ref} className="relative">
      {/* Trigger pill */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-semibold transition-colors active:scale-[0.98] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary)_16%,transparent)]"
        style={{ color: "var(--primary)" }}
        aria-label={`${tips.length} travel tips`}
      >
        <span className="text-xs">{"\uD83C\uDDEF\uD83C\uDDF5"}</span>
        <span>{tips.length}</span>
      </button>

      {open && createPortal(
        popoverContent,
        document.querySelector("[data-variant='b']") ?? document.body,
      )}
    </div>
  );
}

function PopoverContent({ tips }: { tips: { id: string; title: string; summary: string; content?: string; icon: string }[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="p-3 space-y-1.5">
      {tips.map((tip) => (
        <div
          key={tip.id}
          className={`flex items-start gap-2.5 rounded-xl p-2.5${tip.content ? " cursor-pointer" : ""}`}
          style={{ backgroundColor: "var(--surface)" }}
          onClick={tip.content ? () => setExpandedId(expandedId === tip.id ? null : tip.id) : undefined}
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
            {tip.content && expandedId === tip.id && (
              <p
                className="mt-1.5 border-t pt-1.5 text-xs leading-relaxed"
                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)", opacity: 0.8 }}
              >
                {tip.content}
              </p>
            )}
          </div>
          {tip.content && (
            <ChevronDown
              className="mt-0.5 h-3 w-3 shrink-0 transition-transform"
              style={{
                color: "var(--muted-foreground)",
                opacity: 0.5,
                transform: expandedId === tip.id ? "rotate(180deg)" : undefined,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
