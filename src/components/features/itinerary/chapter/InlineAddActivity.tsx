"use client";

import { useState } from "react";
import type { ItineraryActivity } from "@/types/itinerary";
import { CustomActivityForm } from "@/components/features/itinerary/CustomActivityForm";
import { LocationSearchBar } from "@/components/features/itinerary/LocationSearchBar";

export type InlineAddActivityProps = {
  dayActivities: ItineraryActivity[];
  onAdd: (
    activity: Extract<ItineraryActivity, { kind: "place" }>,
    meta: { addressSource: "mapbox" | "google" | "as-is" | "none" },
  ) => void;
  /** Current day's city for trip-context-aware catalog ranking. */
  currentDayCity?: string;
  /** All cities in the trip — used to surface results outside the current day's city but still in-trip. */
  tripCities?: string[];
};

export function InlineAddActivity({
  dayActivities,
  onAdd,
  currentDayCity,
  tripCities,
}: InlineAddActivityProps) {
  const [tab, setTab] = useState<"catalog" | "custom">("catalog");

  return (
    <div>
      <div className="mb-4 flex border-b border-border">
        <button
          type="button"
          onClick={() => setTab("catalog")}
          className={`flex-1 min-h-11 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary ${tab === "catalog" ? "border-b-2 border-brand-primary font-medium text-foreground" : "text-foreground-secondary"}`}
        >
          Search catalog
        </button>
        <button
          type="button"
          onClick={() => setTab("custom")}
          className={`flex-1 min-h-11 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary ${tab === "custom" ? "border-b-2 border-brand-primary font-medium text-foreground" : "text-foreground-secondary"}`}
        >
          Add custom
        </button>
      </div>
      {tab === "catalog" ? (
        <LocationSearchBar
          dayActivities={dayActivities}
          defaultExpanded
          currentDayCity={currentDayCity}
          tripCities={tripCities}
          onAddActivity={(activity) => {
            onAdd(activity, { addressSource: "mapbox" });
          }}
        />
      ) : (
        <CustomActivityForm
          onSubmit={(activity, meta) => {
            onAdd(activity, meta);
          }}
          onCancel={() => setTab("catalog")}
        />
      )}
    </div>
  );
}
