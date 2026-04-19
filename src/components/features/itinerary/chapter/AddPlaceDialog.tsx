"use client";

import { useState, useEffect } from "react";
import type { ItineraryActivity } from "@/types/itinerary";
import { InlineAddActivity } from "@/components/features/itinerary/chapter/InlineAddActivity";

export type AddPlaceDialogDay = {
  index: number;
  label: string;
  activities: ItineraryActivity[];
};

export type AddPlaceDialogProps = {
  open: boolean;
  onClose: () => void;
  days: AddPlaceDialogDay[];
  defaultDayIndex: number;
  onAdd: (
    dayIndex: number,
    activity: Extract<ItineraryActivity, { kind: "place" }>,
    meta: { addressSource: "mapbox" | "google" | "as-is" | "none" },
  ) => void;
};

export function AddPlaceDialog({
  open,
  onClose,
  days,
  defaultDayIndex,
  onAdd,
}: AddPlaceDialogProps) {
  const [selectedDayIdx, setSelectedDayIdx] = useState(defaultDayIndex);

  // Reset the selected day whenever the dialog reopens to honor the latest
  // defaultDayIndex (reflects current scroll position in ChapterList).
  useEffect(() => {
    if (open) setSelectedDayIdx(defaultDayIndex);
  }, [open, defaultDayIndex]);

  if (!open) return null;

  const selectedDay = days[selectedDayIdx] ?? days[0];

  return (
    <div
      className="fixed inset-0 z-40 bg-charcoal/40 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-label="Add a place"
        className="w-full max-w-lg bg-background rounded-md shadow-[var(--shadow-elevated)] p-6 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-medium text-foreground">Add a place</h2>
            <div className="text-sm text-foreground-secondary mt-0.5">
              <label className="inline-flex items-center gap-2">
                <span>Adding to</span>
                <select
                  value={selectedDayIdx}
                  onChange={(e) => setSelectedDayIdx(Number(e.target.value))}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground"
                >
                  {days.map((d) => (
                    <option key={d.index} value={d.index}>{d.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-foreground-secondary"
          >
            Close ✕
          </button>
        </header>
        {selectedDay && (
          <InlineAddActivity
            dayActivities={selectedDay.activities}
            onAdd={(activity, meta) => {
              onAdd(selectedDay.index, activity, meta);
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}
