"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Itinerary, type ItineraryActivity } from "@/types/itinerary";
import { DaySelector } from "./DaySelector";
import { ItineraryTimeline } from "./ItineraryTimeline";
import { MapPanelPlaceholder } from "./MapPanelPlaceholder";

type ItineraryShellProps = {
  tripId: string;
  itinerary: Itinerary;
  onItineraryChange?: (next: Itinerary) => void;
};

const normalizeItinerary = (incoming: Itinerary): Itinerary => {
  return {
    days: (incoming.days ?? []).map((day) => ({
      ...day,
      activities: (day.activities ?? []).map((activity) => {
        if (
          activity &&
          typeof activity === "object" &&
          "kind" in activity &&
          activity.kind
        ) {
          const typedActivity = activity as ItineraryActivity;
          if (typedActivity.kind === "note") {
            return {
              ...typedActivity,
              startTime:
                typedActivity.startTime !== undefined
                  ? typedActivity.startTime
                  : undefined,
              endTime:
                typedActivity.endTime !== undefined
                  ? typedActivity.endTime
                  : undefined,
            };
          }
          return typedActivity;
        }

        const legacyActivity = activity as Omit<
          Extract<ItineraryActivity, { kind: "place" }>,
          "kind"
        >;

        return {
          kind: "place",
          ...legacyActivity,
        };
      }),
    })),
  };
};

export const ItineraryShell = ({ itinerary, tripId, onItineraryChange }: ItineraryShellProps) => {
  const [selectedDay, setSelectedDay] = useState(0);
  const [model, setModel] = useState<Itinerary>(() => normalizeItinerary(itinerary));
  const serializedItinerary = useMemo(() => JSON.stringify(itinerary), [itinerary]);
  const previousSerializedRef = useRef(serializedItinerary);
  const skipSyncRef = useRef(true);

  useEffect(() => {
    if (previousSerializedRef.current === serializedItinerary) {
      return;
    }
    previousSerializedRef.current = serializedItinerary;
    setModel(normalizeItinerary(itinerary));
    skipSyncRef.current = true;
    setSelectedDay(0);
  }, [serializedItinerary, itinerary, tripId]);

  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    onItineraryChange?.(model);
  }, [model, onItineraryChange]);

  const days = model.days ?? [];
  const safeSelectedDay =
    days.length === 0 ? 0 : Math.min(selectedDay, Math.max(days.length - 1, 0));
  const currentDay = days[safeSelectedDay];

  return (
    <section className="mx-auto h-[calc(100vh-120px)] max-w-screen-2xl p-6 md:h-[calc(100vh-140px)]">
      <div className="grid h-full grid-cols-1 gap-6 xl:grid-cols-[minmax(380px,40%)_1fr]">
        <MapPanelPlaceholder
          day={safeSelectedDay}
          activities={currentDay?.activities ?? []}
        />
        <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-4">
            <DaySelector
              totalDays={days.length}
              selected={safeSelectedDay}
              onChange={setSelectedDay}
              labels={days.map((day) => day.dateLabel ?? "")}
            />
          </div>
          <div className="flex-1 overflow-y-auto p-4 pr-2">
            {currentDay ? (
              <ItineraryTimeline
                day={currentDay}
                dayIndex={safeSelectedDay}
                model={model}
                setModel={setModel}
              />
            ) : (
              <p className="text-sm text-gray-500">
                We could not find this itinerary day. Please select another.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};


