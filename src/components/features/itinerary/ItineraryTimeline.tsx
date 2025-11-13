"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  useMemo,
  useCallback,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { ActivityRow } from "./ActivityRow";
import {
  type Itinerary,
  type ItineraryActivity,
  type ItineraryDay,
} from "@/types/itinerary";

type TimeOfDay = ItineraryActivity["timeOfDay"];

type ItineraryTimelineProps = {
  day: ItineraryDay;
  dayIndex: number;
  model: Itinerary;
  setModel: Dispatch<SetStateAction<Itinerary>>;
  selectedActivityId?: string | null;
  onSelectActivity?: (activityId: string) => void;
};

const SECTION_LABELS: Record<
  TimeOfDay,
  { title: string; description: string }
> = {
  morning: {
    title: "Morning",
    description: "Start the day with energizing plans.",
  },
  afternoon: {
    title: "Afternoon",
    description: "Keep exploring with midday highlights.",
  },
  evening: {
    title: "Evening",
    description: "Wind down with memorable nights.",
  },
};

const buildSections = (
  activities: ItineraryActivity[],
): Record<TimeOfDay, ItineraryActivity[]> => {
  const activitiesByTime: Record<TimeOfDay, ItineraryActivity[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };

  activities.forEach((activity) => {
    activitiesByTime[activity.timeOfDay]?.push(activity);
  });

  return activitiesByTime;
};

const SortableActivity = ({
  activity,
  onDelete,
  onUpdate,
  isSelected,
  onSelect,
}: {
  activity: ItineraryActivity;
  onDelete: () => void;
  onUpdate: (patch: Partial<ItineraryActivity>) => void;
  isSelected?: boolean;
  onSelect?: (activityId: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

  return (
    <ActivityRow
      ref={setNodeRef}
      activity={activity}
      onDelete={onDelete}
      onUpdate={onUpdate}
      attributes={attributes as unknown as Record<string, unknown>}
      listeners={listeners as unknown as Record<string, unknown>}
      isDragging={isDragging}
      transform={transform}
      transition={transition}
      isSelected={isSelected}
      onSelect={onSelect}
      onHover={onSelect}
    />
  );
};

const DroppableSection = ({
  sectionKey,
  activities,
  children,
}: {
  sectionKey: TimeOfDay;
  activities: ItineraryActivity[];
  children: ReactNode;
}) => {
  const { setNodeRef } = useDroppable({ id: sectionKey });

  return (
    <SortableContext
      id={sectionKey}
      items={activities.map((activity) => activity.id)}
      strategy={verticalListSortingStrategy}
    >
      <ul ref={setNodeRef} className="space-y-3">
        {children}
      </ul>
    </SortableContext>
  );
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

  const createNoteActivity = useCallback(
    (timeOfDay: TimeOfDay): ItineraryActivity => ({
      kind: "note",
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `note-${Date.now()}-${Math.random()}`,
      title: "Note",
      timeOfDay,
      notes: "",
      startTime: undefined,
      endTime: undefined,
    }),
    [],
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
    [createNoteActivity, dayIndex, setModel],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-10">
        {(Object.keys(SECTION_LABELS) as TimeOfDay[]).map((sectionKey) => {
          const meta = SECTION_LABELS[sectionKey];
          const activities = sections[sectionKey] ?? [];
          const headingId = `${sectionKey}-activities`;
          const hasActivities = activities.length > 0;
          const addNoteLabel = `Add note to ${meta.title}`;
          return (
            <section
              key={sectionKey}
              aria-labelledby={headingId}
              className="space-y-4"
            >
              <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                  <h2
                    id={headingId}
                    className="text-lg font-semibold text-gray-900"
                  >
                    {meta.title}
                  </h2>
                  <p className="text-sm text-gray-500">{meta.description}</p>
                </div>
                {hasActivities ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      aria-label={addNoteLabel}
                      onClick={() => handleAddNote(sectionKey)}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                      + Add note
                    </button>
                  </div>
                ) : null}
              </header>
              {activities.length > 0 ? (
                <DroppableSection
                  sectionKey={sectionKey}
                  activities={activities}
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
                </DroppableSection>
              ) : (
                <DroppableSection
                  sectionKey={sectionKey}
                  activities={[]}
                >
                  <li className="rounded-xl border-2 border-dashed border-gray-300 p-6 text-gray-500">
                    <div className="flex flex-col items-start gap-3">
                      <p className="text-sm">
                        No activities yet for this part of the day.
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          aria-label={addNoteLabel}
                          onClick={() => handleAddNote(sectionKey)}
                          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        >
                          + Add note
                        </button>
                      </div>
                    </div>
                  </li>
                </DroppableSection>
              )}
            </section>
          );
        })}
      </div>
    </DndContext>
  );
};

