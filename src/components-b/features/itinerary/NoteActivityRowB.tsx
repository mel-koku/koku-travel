"use client";

import { forwardRef, type ChangeEvent } from "react";
import { StickyNote, Trash2 } from "lucide-react";
import type { ItineraryActivity } from "@/types/itinerary";

type NoteActivityRowBProps = {
  activity: Extract<ItineraryActivity, { kind: "note" }>;
  onUpdate: (patch: Partial<ItineraryActivity>) => void;
  onDelete: () => void;
  isReadOnly?: boolean;
};

export const NoteActivityRowB = forwardRef<HTMLDivElement, NoteActivityRowBProps>(
  function NoteActivityRowB({ activity, onUpdate, onDelete, isReadOnly }, ref) {
    const notesValue = activity.notes ?? "";

    const handleNotesChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate({ notes: event.target.value });
    };

    return (
      <div
        ref={ref}
        className="group relative rounded-2xl bg-[var(--card)] p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
        data-kind="note"
        data-activity-id={activity.id}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: "var(--surface)" }}
            >
              <StickyNote className="h-4 w-4" style={{ color: "var(--muted-foreground)" }} />
            </div>
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Note
            </span>
          </div>

          {!isReadOnly && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              className="rounded-xl p-1.5 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-[color-mix(in_srgb,var(--error)_10%,transparent)]"
              style={{ color: "var(--error)" }}
              aria-label="Delete note"
              title="Delete note"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="mt-3">
          {isReadOnly ? (
            notesValue ? (
              <p
                className="whitespace-pre-wrap text-sm leading-relaxed"
                style={{ color: "var(--foreground-body)" }}
              >
                {notesValue}
              </p>
            ) : (
              <p
                className="text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                No notes added.
              </p>
            )
          ) : (
            <textarea
              className="w-full resize-none rounded-xl border px-3 py-2.5 text-base leading-relaxed transition-colors duration-200 placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--border)",
                color: "var(--foreground-body)",
                backgroundColor: "var(--background)",
              }}
              rows={3}
              value={notesValue}
              onChange={handleNotesChange}
              placeholder="Add reminders, tips, or context for this part of the day."
            />
          )}
        </div>
      </div>
    );
  },
);
