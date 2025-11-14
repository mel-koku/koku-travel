import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { ReactNode } from "react";
import type { ItineraryActivity } from "@/types/itinerary";
import type { TimeOfDay } from "./timelineUtils";
import { SECTION_LABELS } from "./timelineUtils";

type TimelineSectionProps = {
  sectionKey: TimeOfDay;
  activities: ItineraryActivity[];
  selectedActivityId?: string | null;
  onSelectActivity?: (activityId: string) => void;
  onDelete: (activityId: string) => void;
  onUpdate: (activityId: string, patch: Partial<ItineraryActivity>) => void;
  onAddNote: (timeOfDay: TimeOfDay) => void;
  children: ReactNode;
};

export function TimelineSection({
  sectionKey,
  activities,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  selectedActivityId: _selectedActivityId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSelectActivity: _onSelectActivity,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDelete: _onDelete,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUpdate: _onUpdate,
  onAddNote,
  children,
}: TimelineSectionProps) {
  const { setNodeRef } = useDroppable({ id: sectionKey });
  const meta = SECTION_LABELS[sectionKey];
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
          <h2 id={headingId} className="text-lg font-semibold text-gray-900">
            {meta.title}
          </h2>
          <p className="text-sm text-gray-500">{meta.description}</p>
        </div>
        {hasActivities ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              aria-label={addNoteLabel}
              onClick={() => onAddNote(sectionKey)}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              + Add note
            </button>
          </div>
        ) : null}
      </header>
      {activities.length > 0 ? (
        <SortableContext
          id={sectionKey}
          items={activities.map((activity) => activity.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul ref={setNodeRef} className="space-y-3">
            {children}
          </ul>
        </SortableContext>
      ) : (
        <SortableContext
          id={sectionKey}
          items={[]}
          strategy={verticalListSortingStrategy}
        >
          <ul ref={setNodeRef} className="space-y-3">
            <li className="rounded-xl border-2 border-dashed border-gray-300 p-6 text-gray-500">
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm">
                  No activities yet for this part of the day.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    aria-label={addNoteLabel}
                    onClick={() => onAddNote(sectionKey)}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  >
                    + Add note
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </SortableContext>
      )}
    </section>
  );
}

