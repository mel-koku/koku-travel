"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useAppState } from "@/state/AppState";
import type { Itinerary, ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";

type TimeOfDay = Extract<ItineraryActivity["timeOfDay"], "morning" | "afternoon" | "evening">;

type AddToItineraryButtonProps = {
  location: Location;
};

const TIME_OF_DAY_OPTIONS: Array<{ label: string; value: TimeOfDay }> = [
  { label: "Morning", value: "morning" },
  { label: "Afternoon", value: "afternoon" },
  { label: "Evening", value: "evening" },
];

export function AddToItineraryButton({ location }: AddToItineraryButtonProps) {
  const { trips, updateTripItinerary } = useAppState();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>(() => trips[0]?.id ?? "");
  const [selectedDay, setSelectedDay] = useState<string>("0");
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<TimeOfDay>("afternoon");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!trips.length) {
      setSelectedTripId("");
      setSelectedDay("0");
      return;
    }

    if (selectedTripId && trips.some((trip) => trip.id === selectedTripId)) {
      const currentTrip = trips.find((trip) => trip.id === selectedTripId);
      const dayCount = currentTrip?.itinerary?.days?.length ?? 0;
      if (dayCount === 0) {
        setSelectedDay("0");
      } else if (Number(selectedDay) >= dayCount) {
        setSelectedDay(String(Math.max(0, dayCount - 1)));
      }
      return;
    }

    const fallbackTrip = trips[0];
    if (fallbackTrip) {
      setSelectedTripId(fallbackTrip.id);
      setSelectedDay("0");
    }
  }, [selectedTripId, selectedDay, trips]);

  const tripOptions = useMemo(
    () =>
      trips.map((trip) => ({
        value: trip.id,
        label: trip.name,
      })),
    [trips],
  );

  const currentTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) ?? trips[0] ?? null,
    [selectedTripId, trips],
  );

  const dayOptions = useMemo(() => {
    if (!currentTrip) {
      return [{ value: "0", label: "Day 1" }];
    }

    const days = currentTrip.itinerary?.days ?? [];
    if (days.length === 0) {
      return [{ value: "0", label: "Day 1" }];
    }

    return days.map((day, index) => ({
      value: String(index),
      label: day.dateLabel?.trim() && day.dateLabel.trim().length > 0 ? day.dateLabel : `Day ${index + 1}`,
    }));
  }, [currentTrip]);

  const handleOpen = useCallback(() => {
    if (!trips.length) {
      return;
    }
    setFormError(null);
    setIsDialogOpen(true);
  }, [trips.length]);

  const handleClose = useCallback(() => {
    setIsDialogOpen(false);
    setFormError(null);
    setIsSaving(false);
  }, []);

  const handleSave = useCallback(() => {
    if (!currentTrip) {
      setFormError("Select an itinerary to continue.");
      return;
    }

    const dayIndex = Number.parseInt(selectedDay, 10);
    if (Number.isNaN(dayIndex) || dayIndex < 0) {
      setFormError("Choose a valid day for this itinerary.");
      return;
    }

    setIsSaving(true);

    try {
      const nextItinerary = addLocationToItinerary({
        itinerary: currentTrip.itinerary,
        dayIndex,
        timeOfDay: selectedTimeOfDay,
        location,
      });

      updateTripItinerary(currentTrip.id, nextItinerary);
      setIsDialogOpen(false);
      setFormError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong while adding to the itinerary.";
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  }, [currentTrip, location, selectedDay, selectedTimeOfDay, updateTripItinerary]);

  if (!trips.length) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/trip-builder">Start an itinerary</Link>
        </Button>
        <p className="text-xs text-gray-500">Create a trip to begin adding your favorite places.</p>
      </div>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        Add to itinerary
      </Button>

      <Modal
        isOpen={isDialogOpen}
        onClose={handleClose}
        title="Add to itinerary"
        description={`Choose where to place ${location.name} in your travel plans.`}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="favorite-trip-select" className="text-sm font-medium text-gray-700">
              Itinerary
            </label>
            <Select
              id="favorite-trip-select"
              value={selectedTripId || currentTrip?.id}
              onChange={(event) => {
                setSelectedTripId(event.target.value);
                setSelectedDay("0");
              }}
              options={tripOptions}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="favorite-day-select" className="text-sm font-medium text-gray-700">
              Day
            </label>
            <Select
              id="favorite-day-select"
              value={selectedDay}
              onChange={(event) => setSelectedDay(event.target.value)}
              options={dayOptions}
            />
            {currentTrip && currentTrip.itinerary?.days?.length === 0 ? (
              <p className="text-xs text-gray-500">
                We will create the first day of your itinerary for you.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="favorite-time-select" className="text-sm font-medium text-gray-700">
              Time of day
            </label>
            <Select
              id="favorite-time-select"
              value={selectedTimeOfDay}
              onChange={(event) => setSelectedTimeOfDay(event.target.value as TimeOfDay)}
              options={TIME_OF_DAY_OPTIONS}
            />
          </div>

          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} isLoading={isSaving}>
              Add location
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function addLocationToItinerary({
  itinerary,
  dayIndex,
  timeOfDay,
  location,
}: {
  itinerary: Itinerary;
  dayIndex: number;
  timeOfDay: TimeOfDay;
  location: Location;
}): Itinerary {
  const baseItinerary: Itinerary = {
    timezone: itinerary?.timezone,
    days: Array.isArray(itinerary?.days) ? [...itinerary.days] : [],
  };

  const days = baseItinerary.days;

  while (days.length <= dayIndex) {
    days.push({
      dateLabel: `Day ${days.length + 1}`,
      activities: [],
    });
  }

  const activity: ItineraryActivity = createActivityFromLocation(location, timeOfDay);
  const targetDay = days[dayIndex];
  const existingActivities = Array.isArray(targetDay.activities) ? [...targetDay.activities] : [];

  existingActivities.push(activity);

  days[dayIndex] = {
    ...targetDay,
    activities: existingActivities,
  };

  return {
    ...baseItinerary,
    days,
  };
}

function createActivityFromLocation(location: Location, timeOfDay: TimeOfDay): ItineraryActivity {
  const durationMinutes =
    location.recommendedVisit?.typicalMinutes ??
    parseDurationLabelToMinutes(location.estimatedDuration) ??
    undefined;
  const tags = location.category ? [location.category] : undefined;

  return {
    kind: "place",
    id: generateActivityId(),
    title: location.name,
    timeOfDay,
    durationMin: durationMinutes,
    neighborhood: location.city,
    tags,
    notes: location.shortDescription?.trim() || undefined,
    locationId: location.id,
  };
}

function generateActivityId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `activity_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseDurationLabelToMinutes(label?: string): number | null {
  if (!label) {
    return null;
  }

  const trimmed = label.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  const hourMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h/);
  const minuteMatch = trimmed.match(/(\d+)\s*m/);

  let minutes = 0;
  if (hourMatch) {
    minutes += Number.parseFloat(hourMatch[1]) * 60;
  }
  if (minuteMatch) {
    minutes += Number.parseInt(minuteMatch[1], 10);
  }

  if (minutes === 0 && /^\d+$/.test(trimmed)) {
    minutes = Number.parseInt(trimmed, 10);
  }

  return minutes > 0 ? Math.round(minutes) : null;
}

