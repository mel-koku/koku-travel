"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import type { RefinementType } from "@/lib/server/refinementEngine";
import type { Itinerary, ItineraryDay } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";

type DayRefinementButtonsProps = {
  dayIndex: number;
  tripId: string;
  builderData?: TripBuilderData;
  itinerary?: Itinerary;
  onRefine: (refinedDay: ItineraryDay) => void;
  /** Current day start time (e.g., "09:00") */
  currentStartTime?: string;
  /** Callback to change the day start time */
  onStartTimeChange?: (time: string) => void;
  /** Called when refine API returns requiresUnlock (free limit hit, non-Pass) */
  onRequireUnlock?: () => void;
};

const REFINEMENT_OPTIONS: Array<{
  type: RefinementType;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    type: "too_busy",
    label: "Too Busy",
    icon: "\u23F8\uFE0F",
    description: "Remove some activities",
  },
  {
    type: "too_light",
    label: "Too Light",
    icon: "\u2795",
    description: "Add more activities",
  },
  {
    type: "more_food",
    label: "More Food",
    icon: "\uD83C\uDF5C",
    description: "Add dining options",
  },
  {
    type: "more_culture",
    label: "More Culture",
    icon: "\uD83C\uDFDB\uFE0F",
    description: "Add cultural sites",
  },
  {
    type: "more_kid_friendly",
    label: "Kid Friendly",
    icon: "\uD83D\uDC76",
    description: "Make it family-friendly",
  },
  {
    type: "more_rest",
    label: "More Rest",
    icon: "\uD83D\uDE34",
    description: "Add rest time",
  },
  {
    type: "more_craft",
    label: "More Craft",
    icon: "\uD83C\uDFA8",
    description: "Add craft workshops",
  },
];

const START_TIME_OPTIONS = ["08:00", "09:00", "10:00", "11:00"];

export function DayRefinementButtons({
  dayIndex,
  tripId,
  builderData,
  itinerary,
  onRefine,
  currentStartTime = "09:00",
  onStartTimeChange,
  onRequireUnlock,
}: DayRefinementButtonsProps) {
  const [isRefining, setIsRefining] = useState(false);
  const [refinementError, setRefinementError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
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

  const handleRefine = useCallback(async (type: RefinementType) => {
    setIsRefining(true);
    setRefinementError(null);

    if (!builderData || !itinerary) {
      setRefinementError("Missing trip data needed to refine this day.");
      setIsRefining(false);
      return;
    }

    try {
      const response = await fetch("/api/itinerary/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          dayIndex,
          refinementType: type,
          builderData,
          itinerary,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Couldn't adjust this day. Try again." }));
        throw new Error(errorData.error ?? "Couldn't adjust this day. Try again.");
      }

      const data = await response.json();
      if (data.requiresUnlock && onRequireUnlock) {
        setOpen(false);
        onRequireUnlock();
      } else if (data.message) {
        setRefinementError(data.message);
      } else if (data.refinedDay) {
        onRefine(data.refinedDay);
        setOpen(false);
      }
    } catch (error) {
      setRefinementError(error instanceof Error ? error.message : "Couldn't adjust this day. Try again.");
    } finally {
      setIsRefining(false);
    }
  }, [builderData, itinerary, tripId, dayIndex, onRefine, onRequireUnlock]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-xs font-medium text-foreground-secondary transition-colors hover:border-sage/30 hover:bg-sage/10 hover:text-sage"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        Adjust
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1.5 w-72 rounded-lg border border-border bg-surface p-3 shadow-[var(--shadow-elevated)]">
          {/* Day start time */}
          {onStartTimeChange && (
            <div className="mb-3 pb-3 border-b border-border/50">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-stone">
                Start time
              </p>
              <div className="flex gap-1.5">
                {START_TIME_OPTIONS.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => onStartTimeChange(time)}
                    className={`rounded-md px-2.5 py-1 font-mono text-xs font-medium transition ${
                      currentStartTime === time
                        ? "bg-sage/15 text-sage"
                        : "text-foreground-secondary hover:bg-surface hover:text-foreground"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-stone">
            Adjust this day
          </p>
          <div className="flex flex-wrap gap-1.5">
            {REFINEMENT_OPTIONS.map((option) => (
              <Button
                key={option.type}
                variant="outline"
                size="chip"
                onClick={() => handleRefine(option.type)}
                disabled={isRefining}
                className="bg-background text-foreground-secondary hover:border-sage/30 hover:bg-sage/10 hover:text-sage"
                title={option.description}
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </Button>
            ))}
          </div>
          {refinementError && (
            <p className="mt-2 text-xs text-error">{refinementError}</p>
          )}
          {isRefining && (
            <p className="mt-2 text-xs text-stone">Refining day...</p>
          )}
        </div>
      )}
    </div>
  );
}
