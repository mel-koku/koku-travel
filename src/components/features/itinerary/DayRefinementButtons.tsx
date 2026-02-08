"use client";

import { useState } from "react";
import type { RefinementType } from "@/lib/server/refinementEngine";
import type { Itinerary, ItineraryDay } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";

type DayRefinementButtonsProps = {
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
  {
    type: "too_busy",
    label: "Too Busy",
    icon: "⏸️",
    description: "Remove some activities",
  },
  {
    type: "too_light",
    label: "Too Light",
    icon: "➕",
    description: "Add more activities",
  },
  {
    type: "more_food",
    label: "More Food",
    icon: "🍜",
    description: "Add dining options",
  },
  {
    type: "more_culture",
    label: "More Culture",
    icon: "🏛️",
    description: "Add cultural sites",
  },
  {
    type: "more_kid_friendly",
    label: "Kid Friendly",
    icon: "👶",
    description: "Make it family-friendly",
  },
  {
    type: "more_rest",
    label: "More Rest",
    icon: "😴",
    description: "Add rest time",
  },
];

export function DayRefinementButtons({
  dayIndex,
  tripId,
  builderData,
  itinerary,
  onRefine,
}: DayRefinementButtonsProps) {
  const [isRefining, setIsRefining] = useState(false);
  const [refinementError, setRefinementError] = useState<string | null>(null);

  const handleRefine = async (type: RefinementType) => {
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
        const error = await response.json().catch(() => ({ message: "Failed to refine day" }));
        throw new Error(error.message ?? "Failed to refine day");
      }

      const data = await response.json();
      if (data.refinedDay) {
        onRefine(data.refinedDay);
      }
    } catch (error) {
      setRefinementError(error instanceof Error ? error.message : "Failed to refine day");
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {REFINEMENT_OPTIONS.map((option) => (
          <button
            key={option.type}
            type="button"
            onClick={() => handleRefine(option.type)}
            disabled={isRefining}
            className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground-secondary transition hover:border-sage/30 hover:bg-sage/10 hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
            title={option.description}
          >
            <span>{option.icon}</span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
      {refinementError && (
        <p className="text-xs text-error">{refinementError}</p>
      )}
      {isRefining && (
        <p className="text-xs text-stone">Refining day...</p>
      )}
    </div>
  );
}

