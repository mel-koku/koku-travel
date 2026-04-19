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
};

export function InlineAddActivity({ dayActivities, onAdd }: InlineAddActivityProps) {
  const [tab, setTab] = useState<"catalog" | "custom">("catalog");

  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="mb-3 flex border-b border-border">
        <button
          type="button"
          onClick={() => setTab("catalog")}
          className={`flex-1 py-2 text-sm ${tab === "catalog" ? "border-b-2 border-brand-primary font-medium text-foreground" : "text-foreground-secondary"}`}
        >
          Search catalog
        </button>
        <button
          type="button"
          onClick={() => setTab("custom")}
          className={`flex-1 py-2 text-sm ${tab === "custom" ? "border-b-2 border-brand-primary font-medium text-foreground" : "text-foreground-secondary"}`}
        >
          Add custom
        </button>
      </div>
      {tab === "catalog" ? (
        <LocationSearchBar
          dayActivities={dayActivities}
          defaultExpanded
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
