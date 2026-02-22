import { forwardRef, type ChangeEvent } from "react";
import { CSS } from "@dnd-kit/utilities";
import type { Transform } from "@dnd-kit/utilities";
import type { ItineraryActivity } from "@/types/itinerary";
import { DragHandle } from "./DragHandle";

const TIME_OF_DAY_LABEL: Record<ItineraryActivity["timeOfDay"], string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

type NoteActivityRowProps = {
  activity: Extract<ItineraryActivity, { kind: "note" }>;
  onDelete: () => void;
  onUpdate: (patch: Partial<ItineraryActivity>) => void;
  attributes?: Record<string, unknown>;
  listeners?: Record<string, unknown>;
  isDragging?: boolean;
  transform?: Transform | null;
  transition?: string | null;
  isReadOnly?: boolean;
};

export const NoteActivityRow = forwardRef<HTMLDivElement, NoteActivityRowProps>(
  (
    {
      activity,
      onDelete,
      onUpdate,
      attributes,
      listeners,
      isDragging,
      transform,
      transition,
      isReadOnly,
    },
    ref,
  ) => {
    const noteStartTime = activity.startTime ?? "";
    const noteEndTime = activity.endTime ?? "";
    const timeInvalid =
      noteStartTime !== "" && noteEndTime !== "" && noteEndTime < noteStartTime;

    const dragStyles =
      transform || transition
        ? {
            transform: transform ? CSS.Transform.toString(transform) : undefined,
            transition: transition ?? undefined,
          }
        : undefined;

    const notesId = `notes-${activity.id}`;
    const noteStartId = `note-start-${activity.id}`;
    const noteEndId = `note-end-${activity.id}`;
    const timeErrorId = `note-time-error-${activity.id}`;
    const notesValue = activity.notes ?? "";
    const noteLabel = `Note for ${TIME_OF_DAY_LABEL[activity.timeOfDay]}`;

    const handleNotesChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
      const nextNotes = event.target.value;
      onUpdate({ notes: nextNotes });
    };

    const dragHandleLabel = `Drag to reorder note for ${TIME_OF_DAY_LABEL[activity.timeOfDay]}`;

    return (
      <div
        ref={ref}
        style={dragStyles}
        className={`rounded-2xl border border-dashed border-sage/30 bg-sage/10 p-4 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
          isDragging ? "ring-2 ring-sage/30 shadow-md" : ""
        }`}
        data-kind="note"
        data-activity-id={activity.id}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {!isReadOnly && (
              <DragHandle
                variant="note"
                label={dragHandleLabel}
                isDragging={isDragging}
                attributes={attributes}
                listeners={listeners}
              />
            )}
            <span className="text-sm font-semibold text-sage">
              {activity.title ?? "Note"}
            </span>
          </div>
          {!isReadOnly && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDelete();
              }}
              className="text-sm font-semibold text-error hover:text-error/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
              aria-label={`Delete note for ${TIME_OF_DAY_LABEL[activity.timeOfDay]}`}
            >
              Delete
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {/* Time display (read-only) or time inputs (editable) */}
          {isReadOnly ? (
            noteStartTime && noteEndTime ? (
              <p className="font-mono text-sm font-medium text-foreground-secondary">
                {`${noteStartTime} – ${noteEndTime}`}
              </p>
            ) : null
          ) : (
            <div className="flex flex-col gap-2 rounded-xl bg-background/60 p-3 shadow-sm">
              <span className="text-sm font-medium text-foreground-secondary">Time (optional)</span>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor={noteStartId} className="text-xs font-medium text-foreground-secondary">
                    Start time
                  </label>
                  <input
                    id={noteStartId}
                    type="time"
                    className="h-10 rounded-xl border border-border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    value={noteStartTime}
                    onChange={(event) => {
                      const value = event.target.value;
                      onUpdate({
                        startTime: value ? value : undefined,
                      } as Partial<ItineraryActivity>);
                    }}
                    aria-invalid={timeInvalid || undefined}
                    aria-describedby={timeInvalid ? timeErrorId : undefined}
                  />
                </div>
                <span className="text-sm text-stone">to</span>
                <div className="flex flex-col gap-1">
                  <label htmlFor={noteEndId} className="text-xs font-medium text-foreground-secondary">
                    End time
                  </label>
                  <input
                    id={noteEndId}
                    type="time"
                    className="h-10 rounded-xl border border-border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    value={noteEndTime}
                    onChange={(event) => {
                      const value = event.target.value;
                      onUpdate({
                        endTime: value ? value : undefined,
                      } as Partial<ItineraryActivity>);
                    }}
                    aria-invalid={timeInvalid || undefined}
                    aria-describedby={timeInvalid ? timeErrorId : undefined}
                  />
                </div>
              </div>
              {timeInvalid ? (
                <p id={timeErrorId} className="text-sm text-error">
                  End time must be after start time.
                </p>
              ) : null}
              {noteStartTime && noteEndTime ? (
                <p className="font-mono text-sm font-medium text-foreground-secondary">
                  {`${noteStartTime} – ${noteEndTime}`}
                </p>
              ) : null}
            </div>
          )}

          {/* Notes content */}
          {isReadOnly ? (
            notesValue ? (
              <p className="text-sm text-foreground-secondary whitespace-pre-wrap">{notesValue}</p>
            ) : null
          ) : (
            <div className="flex flex-col gap-2">
              <label htmlFor={notesId} className="text-sm font-semibold text-foreground-secondary">
                {noteLabel}
              </label>
              <textarea
                id={notesId}
                className="w-full rounded-xl border border-border px-3 py-2 text-base text-foreground-secondary shadow-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary"
                rows={3}
                value={notesValue}
                onChange={handleNotesChange}
                placeholder="Add reminders, tips, or context for this part of the day."
              />
            </div>
          )}
        </div>
      </div>
    );
  },
);

NoteActivityRow.displayName = "NoteActivityRow";

