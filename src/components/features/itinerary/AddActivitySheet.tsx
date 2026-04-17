"use client";

import { useState } from "react";
import type { ItineraryActivity } from "@/types/itinerary";
import { CustomActivityForm } from "./CustomActivityForm";
import { LocationSearchBar } from "./LocationSearchBar";

type Props = {
  open: boolean;
  onClose: () => void;
  dayActivities: ItineraryActivity[];
  onSubmit: (
    activity: Extract<ItineraryActivity, { kind: "place" }>,
    meta: { addressSource: "mapbox" | "google" | "as-is" | "none" },
  ) => void;
};

export function AddActivitySheet({ open, onClose, dayActivities, onSubmit }: Props) {
  const [tab, setTab] = useState<"catalog" | "custom">("catalog");
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-lg bg-white p-4 shadow-lg sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex border-b">
          <button
            type="button"
            onClick={() => setTab("catalog")}
            className={`flex-1 py-2 text-sm ${tab === "catalog" ? "border-b-2 border-blue-600 font-medium" : "text-gray-500"}`}
          >
            Search catalog
          </button>
          <button
            type="button"
            onClick={() => setTab("custom")}
            className={`flex-1 py-2 text-sm ${tab === "custom" ? "border-b-2 border-blue-600 font-medium" : "text-gray-500"}`}
          >
            Add custom
          </button>
        </div>
        {tab === "catalog" ? (
          <LocationSearchBar
            dayActivities={dayActivities}
            onAddActivity={(activity) => {
              onSubmit(activity, { addressSource: "mapbox" });
              onClose();
            }}
          />
        ) : (
          <CustomActivityForm
            onSubmit={(activity, meta) => {
              onSubmit(activity, meta);
              onClose();
            }}
            onCancel={onClose}
          />
        )}
      </div>
    </div>
  );
}
