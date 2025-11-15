"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  useMemo,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  type Itinerary,
  type ItineraryActivity,
  type ItineraryDay,
} from "@/types/itinerary";
import { buildSections, createNoteActivity, type TimeOfDay, SECTION_LABELS } from "./timelineUtils";
import { TimelineSection } from "./TimelineSection";
import { SortableActivity } from "./SortableActivity";
import { REGIONS } from "@/data/regions";

function formatCityName(cityId: string): string {
  for (const region of REGIONS) {
    const city = region.cities.find((c) => c.id === cityId);
    if (city) {
      return city.name;
    }
  }
  // Fallback: capitalize first letter
  return cityId.charAt(0).toUpperCase() + cityId.slice(1);
}

type ItineraryTimelineProps = {
  day: ItineraryDay;
  dayIndex: number;
  model: Itinerary;
  setModel: Dispatch<SetStateAction<Itinerary>>;
  selectedActivityId?: string | null;
  onSelectActivity?: (activityId: string) => void;
};

export const ItineraryTimeline = ({
  day,
  dayIndex,
  model: _model,
  setModel,
  selectedActivityId,
  onSelectActivity,
}: ItineraryTimelineProps) => {
  void _model;
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const sections = useMemo(
    () => buildSections(day.activities ?? []),
    [day.activities],
  );

  const handleDelete = useCallback(
    (activityId: string) => {
      setModel((current) => {
        let hasChanged = false;
        const nextDays = current.days.map((entry, index) => {
          if (index !== dayIndex) return entry;

          const nextActivities = entry.activities.filter((activity) => {
            const shouldKeep = activity.id !== activityId;
            if (!shouldKeep) {
              hasChanged = true;
            }
            return shouldKeep;
          });

          if (!hasChanged) {
            return entry;
          }

          return { ...entry, activities: nextActivities };
        });

        return hasChanged ? { ...current, days: nextDays } : current;
      });
    },
    [dayIndex, setModel],
  );

  const handleUpdate = useCallback(
    (activityId: string, patch: Partial<ItineraryActivity>) => {
      setModel((current) => {
        let hasChanged = false;
        const nextDays = current.days.map((entry, index) => {
          if (index !== dayIndex) return entry;

          const nextActivities = entry.activities.map((activity) => {
            if (activity.id !== activityId) return activity;

            const nextActivity = { ...activity, ...patch } as ItineraryActivity;
            hasChanged =
              hasChanged ||
              Object.entries(patch).some(([key, value]) => {
                const typedKey = key as keyof ItineraryActivity;
                return activity[typedKey] !== value;
              });
            return nextActivity;
          });

          return hasChanged ? { ...entry, activities: nextActivities } : entry;
        });

        return hasChanged ? { ...current, days: nextDays } : current;
      });
    },
    [dayIndex, setModel],
  );

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      if (activeId === overId) return;

      setModel((current) => {
        let hasChanged = false;

        const nextDays = current.days.map((entry, index) => {
          if (index !== dayIndex) return entry;

          const grouped = buildSections(entry.activities);
          const sourceContainer = active.data.current?.sortable
            ?.containerId as TimeOfDay | undefined;
          const targetContainer =
            (over.data.current?.sortable?.containerId as
              | TimeOfDay
              | undefined) ??
            ((overId === "morning" ||
            overId === "afternoon" ||
            overId === "evening"
              ? overId
              : undefined) as TimeOfDay | undefined);

          if (!sourceContainer || !targetContainer) {
            return entry;
          }

          const sourceList = [...grouped[sourceContainer]];
          const initialTargetList =
            sourceContainer === targetContainer
              ? [...sourceList]
              : [...grouped[targetContainer]];

          const activeIndex = sourceList.findIndex(
            (activity) => activity.id === activeId,
          );

          if (activeIndex === -1) {
            return entry;
          }

          const movingActivity = sourceList[activeIndex];

          if (!movingActivity) {
            return entry;
          }

          if (sourceContainer === targetContainer) {
            const updatedList = [...sourceList];
            updatedList.splice(activeIndex, 1);

            const overIndex = initialTargetList.findIndex(
              (activity) => activity.id === overId,
            );
            const destinationIndex =
              overIndex >= 0 ? overIndex : updatedList.length;

            updatedList.splice(
              Math.min(destinationIndex, updatedList.length),
              0,
              movingActivity,
            );

            grouped[sourceContainer] = updatedList;
            hasChanged = true;
          } else {
            const updatedSource = [...sourceList];
            updatedSource.splice(activeIndex, 1);

            const updatedTarget = [...initialTargetList];
            const overIndex = updatedTarget.findIndex(
              (activity) => activity.id === overId,
            );
            const insertIndex =
              overIndex >= 0 ? overIndex : updatedTarget.length;

            updatedTarget.splice(insertIndex, 0, {
              ...movingActivity,
              timeOfDay: targetContainer,
            });

            grouped[sourceContainer] = updatedSource;
            grouped[targetContainer] = updatedTarget;
            hasChanged = true;
          }

          const nextActivities = [
            ...grouped.morning,
            ...grouped.afternoon,
            ...grouped.evening,
          ];

          return hasChanged ? { ...entry, activities: nextActivities } : entry;
        });

        return hasChanged ? { ...current, days: nextDays } : current;
      });
    },
    [dayIndex, setModel],
  );

  const handleAddNote = useCallback(
    (timeOfDay: TimeOfDay) => {
      setModel((current) => {
        const nextDays = current.days.map((entry, index) => {
          if (index !== dayIndex) return entry;

          const nextActivities = [
            ...(entry.activities ?? []),
            createNoteActivity(timeOfDay),
          ];

          return { ...entry, activities: nextActivities };
        });

        return { ...current, days: nextDays };
      });
    },
    [dayIndex, setModel],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-10">
        {/* City Transition Display */}
        {day.cityTransition && (
          <div className="rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-indigo-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-indigo-900">
                  Traveling from {formatCityName(day.cityTransition.fromCityId)} to{" "}
                  {formatCityName(day.cityTransition.toCityId)}
                </h4>
                <div className="mt-1 space-y-1 text-sm text-indigo-700">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Mode:</span>
                    <span className="capitalize">{day.cityTransition.mode}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Duration:</span>
                    <span>
                      {day.cityTransition.durationMinutes} minute
                      {day.cityTransition.durationMinutes !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {day.cityTransition.departureTime && day.cityTransition.arrivalTime && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Time:</span>
                      <span>
                        {day.cityTransition.departureTime} → {day.cityTransition.arrivalTime}
                      </span>
                    </div>
                  )}
                  {day.cityTransition.notes && (
                    <p className="text-xs text-indigo-600">{day.cityTransition.notes}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {(Object.keys(SECTION_LABELS) as TimeOfDay[]).map((sectionKey) => {
          const activities = sections[sectionKey] ?? [];
          return (
            <TimelineSection
              key={sectionKey}
              sectionKey={sectionKey}
              activities={activities}
              selectedActivityId={selectedActivityId}
              onSelectActivity={onSelectActivity}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              onAddNote={handleAddNote}
            >
              {activities.map((activity) => (
                <SortableActivity
                  key={activity.id}
                  activity={activity}
                  onDelete={() => handleDelete(activity.id)}
                  onUpdate={(patch) => handleUpdate(activity.id, patch)}
                  isSelected={activity.id === selectedActivityId}
                  onSelect={onSelectActivity}
                />
              ))}
            </TimelineSection>
          );
        })}
      </div>
    </DndContext>
  );
};

