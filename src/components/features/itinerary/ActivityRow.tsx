'use client';

import {
  forwardRef,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import { ItineraryActivity } from "@/types/itinerary";
import { CSS } from "@dnd-kit/utilities";
import type { Transform } from "@dnd-kit/utilities";

type ActivityRowProps = {
  activity: ItineraryActivity;
  onDelete: () => void;
  onUpdate: (patch: Partial<ItineraryActivity>) => void;
  attributes?: Record<string, unknown>;
  listeners?: Record<string, unknown>;
  isDragging?: boolean;
  transform?: Transform | null;
  transition?: string | null;
};

const TIME_OF_DAY_LABEL: Record<
  ItineraryActivity["timeOfDay"],
  string
> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export const ActivityRow = forwardRef<HTMLLIElement, ActivityRowProps>(
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
    },
    ref,
  ) => {
    const isNote = activity.kind === "note";
    const noteActivity = isNote ? activity : null;
    const placeActivity = activity.kind === "place" ? activity : null;
    const [notesOpen, setNotesOpen] = useState(
      () => isNote || Boolean(activity.notes),
    );
    const noteStartTime = noteActivity?.startTime ?? "";
    const noteEndTime = noteActivity?.endTime ?? "";
    const timeInvalid =
      noteStartTime !== "" &&
      noteEndTime !== "" &&
      noteEndTime < noteStartTime;

    const durationLabel = useMemo(() => {
      if (!placeActivity?.durationMin) return null;
      const durationMin = placeActivity.durationMin;
      const hours = durationMin / 60;
      if (hours >= 1) {
        const rounded = Number.isInteger(hours)
          ? hours
          : Math.round(hours * 10) / 10;
        return `~${rounded}h`;
      }
      return `~${durationMin}m`;
    }, [placeActivity?.durationMin]);

    const handleToggleNotes = () => {
      if (isNote) return;
      if (notesOpen) {
        const trimmed = placeActivity?.notes?.trim();
        onUpdate({ notes: trimmed ? placeActivity?.notes : undefined });
      }
      setNotesOpen((prev) => !prev);
    };

    const handleDelete = () => {
      if (window.confirm(`Remove "${activity.title}" from this day?`)) {
        onDelete();
      }
    };

    const handleNotesChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
      const nextNotes = event.target.value;
      if (isNote) {
        onUpdate({ notes: nextNotes });
      } else {
        onUpdate({ notes: nextNotes.trim() ? nextNotes : undefined });
      }
    };

    const dragStyles =
      transform || transition
        ? {
            transform: transform ? CSS.Transform.toString(transform) : undefined,
            transition: transition ?? undefined,
          }
        : undefined;

    const baseClasses =
      "rounded-xl p-4 transition flex flex-col gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-within:ring-2 focus-within:ring-indigo-400";
    const draggingClasses = isDragging
      ? "shadow-md ring-2 ring-indigo-200"
      : "";
    const noteClasses = isNote
      ? [
          "border border-dashed border-indigo-200 border-l-4 border-l-indigo-300",
          "bg-indigo-50/50 hover:bg-indigo-50 focus-within:bg-indigo-50",
        ]
          .filter(Boolean)
          .join(" ")
      : "border border-gray-200 bg-white hover:bg-gray-50";
    const containerClasses = [baseClasses, draggingClasses, noteClasses]
      .filter(Boolean)
      .join(" ");

    const notesId = `notes-${activity.id}`;
    const noteStartId = `note-start-${activity.id}`;
    const noteEndId = `note-end-${activity.id}`;
    const timeErrorId = `note-time-error-${activity.id}`;
    const notesValue =
      activity.kind === "note"
        ? activity.notes
        : activity.notes
          ? activity.notes
          : "";
    const noteLabel =
      activity.kind === "note"
        ? `Note for ${TIME_OF_DAY_LABEL[activity.timeOfDay]}`
        : `Notes for ${activity.title}`;

    return (
      <li
        ref={ref}
        className={containerClasses}
        style={dragStyles}
        {...attributes}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-1 flex-col gap-1">
            {isNote ? (
              <button
                type="button"
                className="mb-2 w-fit text-left text-xs font-semibold text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                aria-label={`Drag to reorder note for ${TIME_OF_DAY_LABEL[activity.timeOfDay]}`}
                {...listeners}
              >
                Note
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="text-left text-base font-medium text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  aria-label={`Drag to reorder ${activity.title}`}
                  {...listeners}
                >
                  {activity.title}
                </button>
                {placeActivity?.neighborhood ? (
                  <p className="text-sm text-gray-500">
                    {placeActivity.neighborhood}
                  </p>
                ) : null}
              </>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 text-sm text-gray-500">
            {durationLabel ?? ""}
            <button
              type="button"
              onClick={handleDelete}
              className="ml-auto text-sm text-red-600 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              aria-label={`Delete ${activity.title}`}
            >
              Delete
            </button>
          </div>
        </div>
        {placeActivity?.tags?.length ? (
          <div className="flex flex-wrap gap-2">
            {placeActivity.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        {isNote ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">
                Time (optional)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor={noteStartId}
                    className="text-sm text-gray-600"
                  >
                    Start time
                  </label>
                  <input
                    id={noteStartId}
                    type="time"
                    className="h-10 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <span className="text-sm text-gray-500">to</span>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor={noteEndId}
                    className="text-sm text-gray-600"
                  >
                    End time
                  </label>
                  <input
                    id={noteEndId}
                    type="time"
                    className="h-10 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <p
                  id={timeErrorId}
                  className="mt-1 text-sm text-red-600"
                >
                  End time must be after start time.
                </p>
              ) : null}
            </div>
            {noteStartTime && noteEndTime ? (
              <p className="text-sm font-medium text-gray-500">
                {`${noteStartTime} - ${noteEndTime}`}
              </p>
            ) : null}
            <label htmlFor={notesId} className="text-sm font-medium text-gray-700">
              {noteLabel}
            </label>
            <textarea
              id={notesId}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              rows={3}
              value={notesValue}
              onChange={handleNotesChange}
              placeholder="Add reminders, tips, or context for this part of the day."
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleToggleNotes}
              className="self-start text-sm font-medium text-indigo-600 hover:text-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              {notesOpen ? "Hide Note" : "Add Note"}
            </button>
            {notesOpen ? (
              <div className="flex flex-col gap-1">
                <label
                  htmlFor={notesId}
                  className="text-sm font-medium text-gray-700"
                >
                  {noteLabel}
                </label>
                <textarea
                  id={notesId}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  value={notesValue}
                  onChange={handleNotesChange}
                  placeholder="Add helpful details, reminders, or context for this activity."
                />
              </div>
            ) : null}
          </div>
        )}
      </li>
    );
  },
);

ActivityRow.displayName = "ActivityRow";


