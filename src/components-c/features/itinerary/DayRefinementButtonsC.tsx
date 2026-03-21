"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal } from "lucide-react";
import type { RefinementType } from "@/lib/server/refinementEngine";
import type { Itinerary, ItineraryDay } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";

type DayRefinementButtonsCProps = {
  dayIndex: number;
  tripId: string;
  builderData?: TripBuilderData;
  itinerary?: Itinerary;
  onRefine: (refinedDay: ItineraryDay) => void;
};

const REFINEMENT_OPTIONS: Array<{
  type: RefinementType;
  label: string;
  icon: string;
  description: string;
}> = [
  { type: "too_busy", label: "Too Busy", icon: "\u23F8\uFE0F", description: "Remove some activities" },
  { type: "too_light", label: "Too Light", icon: "\u2795", description: "Add more activities" },
  { type: "more_food", label: "More Food", icon: "\uD83C\uDF5C", description: "Add dining options" },
  { type: "more_culture", label: "More Culture", icon: "\uD83C\uDFDB\uFE0F", description: "Add cultural sites" },
  { type: "more_kid_friendly", label: "Kid Friendly", icon: "\uD83D\uDC76", description: "Make it family-friendly" },
  { type: "more_rest", label: "More Rest", icon: "\uD83D\uDE34", description: "Add rest time" },
  { type: "more_craft", label: "More Craft", icon: "\uD83C\uDFA8", description: "Add craft workshops" },
];

export function DayRefinementButtonsC({
  dayIndex,
  tripId,
  builderData,
  itinerary,
  onRefine,
}: DayRefinementButtonsCProps) {
  const [isRefining, setIsRefining] = useState(false);
  const [refinementError, setRefinementError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

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

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  const handleRefine = useCallback(
    async (type: RefinementType) => {
      if (!itinerary) return;
      setIsRefining(true);
      setRefinementError(null);
      setOpen(false);

      try {
        const response = await fetch("/api/itinerary/refine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayIndex,
            refinementType: type,
            itinerary,
            builderData,
          }),
        });

        if (!response.ok) {
          throw new Error(`Refinement failed: ${response.status}`);
        }

        const data = await response.json();
        if (data.refinedDay) {
          onRefine(data.refinedDay);
        }
      } catch (error) {
        setRefinementError(
          error instanceof Error ? error.message : "Failed to refine day"
        );
      } finally {
        setIsRefining(false);
      }
    },
    [dayIndex, tripId, itinerary, builderData, onRefine],
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        disabled={isRefining}
        className="flex h-8 items-center gap-1.5 border px-3 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] active:scale-[0.98] disabled:opacity-50"
        style={{
          borderColor: "var(--border)",
          color: "var(--muted-foreground)",
        }}
      >
        {isRefining ? (
          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <SlidersHorizontal className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">Adjust</span>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div ref={popoverRef} style={popoverStyle}>
            <div
              className="w-52 border p-1"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--card)",
              }}
            >
              {REFINEMENT_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => handleRefine(option.type)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] active:scale-[0.98]"
                  style={{ color: "var(--foreground)" }}
                >
                  <span className="text-sm">{option.icon}</span>
                  <div>
                    <p className="font-bold">{option.label}</p>
                    <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                      {option.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}

      {refinementError && (
        <div
          className="mt-1 text-[10px]"
          style={{ color: "var(--error)" }}
        >
          {refinementError}
        </div>
      )}
    </>
  );
}
