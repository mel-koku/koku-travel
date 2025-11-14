"use client";

import { forwardRef, useMemo, useState, type ChangeEvent, type MouseEvent } from "react";
import { CSS } from "@dnd-kit/utilities";
import type { Transform } from "@dnd-kit/utilities";

import { LocationDetailsModal } from "@/components/features/explore/LocationDetailsModal";
import { useLocationEditorialSummary } from "@/state/locationDetailsStore";
import type { ItineraryActivity } from "@/types/itinerary";
import { findLocationForActivity } from "@/lib/itineraryLocations";
import { DragHandle } from "./DragHandle";
import { StarIcon } from "./activityIcons";
import {
  getShortOverview,
  getLocationRating,
  getLocationReviewCount,
  numberFormatter,
} from "./activityUtils";

const FALLBACK_IMAGES: Record<string, string> = {
  culture:
    "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1600&q=80",
  food: "https://images.unsplash.com/photo-1525708827920-7b83ba848008?auto=format&fit=crop&w=1600&q=80",
  nature:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
  shopping:
    "https://images.unsplash.com/photo-1508339716581-3657ca8caab1?auto=format&fit=crop&w=1600&q=80",
  view: "https://images.unsplash.com/photo-1528287341442-adaa7dc6b52c?auto=format&fit=crop&w=1600&q=80",
};

const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80";

function buildFallbackLocation(
  activity: Extract<ItineraryActivity, { kind: "place" }>,
) {
  const fallbackCategory = activity.tags?.[0] ?? "culture";
  const fallbackCity = activity.neighborhood ?? "Japan";

  return {
    id: activity.id,
    name: activity.title,
    city: fallbackCity,
    region: fallbackCity,
    category: fallbackCategory,
    image: FALLBACK_IMAGES[fallbackCategory] ?? DEFAULT_FALLBACK_IMAGE,
  };
}

type PlaceActivityRowProps = {
  activity: Extract<ItineraryActivity, { kind: "place" }>;
  onDelete: () => void;
  onUpdate: (patch: Partial<ItineraryActivity>) => void;
  attributes?: Record<string, unknown>;
  listeners?: Record<string, unknown>;
  isDragging?: boolean;
  transform?: Transform | null;
  transition?: string | null;
  isSelected?: boolean;
  onSelect?: (activityId: string) => void;
  onHover?: (activityId: string) => void;
};

export const PlaceActivityRow = forwardRef<HTMLLIElement, PlaceActivityRowProps>(
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
      isSelected,
      onSelect,
      onHover,
    },
    ref,
  ) => {
    const [notesOpen, setNotesOpen] = useState(() => Boolean(activity.notes));
    const [detailsOpen, setDetailsOpen] = useState(false);

    const durationLabel = useMemo(() => {
      if (!activity.durationMin) return null;
      const durationMin = activity.durationMin;
      const hours = durationMin / 60;
      if (hours >= 1) {
        const rounded = Number.isInteger(hours)
          ? hours
          : Math.round(hours * 10) / 10;
        return `~${rounded}h`;
      }
      return `~${durationMin}m`;
    }, [activity.durationMin]);

    const handleToggleNotes = () => {
      if (notesOpen) {
        const trimmed = activity.notes?.trim();
        onUpdate({ notes: trimmed ? activity.notes : undefined });
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
      onUpdate({ notes: nextNotes.trim() ? nextNotes : undefined });
    };

    const dragStyles =
      transform || transition
        ? {
            transform: transform ? CSS.Transform.toString(transform) : undefined,
            transition: transition ?? undefined,
          }
        : undefined;

    const placeLocation = useMemo(() => {
      const resolved = findLocationForActivity(activity);
      return resolved ?? buildFallbackLocation(activity);
    }, [activity]);
    const cachedEditorialSummary = useLocationEditorialSummary(placeLocation?.id);
    const summary = placeLocation
      ? getShortOverview(placeLocation, cachedEditorialSummary)
      : null;
    const rating = placeLocation ? getLocationRating(placeLocation) : null;
    const reviewCount = placeLocation
      ? getLocationReviewCount(placeLocation)
      : null;

    const dragHandleLabel = `Drag to reorder ${activity.title}`;

    const handleMoreInfo = (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDetailsOpen(true);
    };

    const schedule = activity?.schedule;
    const travelFromPrevious = activity?.travelFromPrevious;
    const travelStatus = schedule?.status ?? "scheduled";
    const isOutOfHours = travelStatus === "out-of-hours";
    const waitLabel =
      schedule?.arrivalBufferMinutes && schedule.arrivalBufferMinutes > 0
        ? `Wait ${schedule.arrivalBufferMinutes} min`
        : null;

    const handleSelect = () => {
      onSelect?.(activity.id);
    };

    const handleHover = () => {
      onHover?.(activity.id);
    };

    const notesId = `notes-${activity.id}`;
    const noteLabel = `Notes for ${activity.title}`;
    const notesValue = activity.notes ? activity.notes : "";

    return (
      <li
        ref={ref}
        style={dragStyles}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        data-kind="place"
        data-selected={isSelected || undefined}
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleSelect();
          }
        }}
        onMouseEnter={handleHover}
        onFocus={handleHover}
        data-activity-id={activity.id}
      >
        <div
          className={`group relative overflow-hidden rounded-3xl border bg-white transition duration-200 ${
            isDragging
              ? "border-indigo-300 ring-2 ring-indigo-300 shadow-lg"
              : isSelected
                ? "border-indigo-400 ring-2 ring-indigo-400 shadow-lg"
                : "border-gray-200 shadow-sm hover:border-indigo-200 hover:shadow-lg"
          }`}
        >
          <div className="p-6 space-y-4">
            {travelFromPrevious ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-700">
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 font-semibold">
                  Travel · {travelFromPrevious.mode} · {travelFromPrevious.durationMinutes} min
                </span>
                {travelFromPrevious.departureTime && travelFromPrevious.arrivalTime ? (
                  <span className="rounded-full bg-white px-2.5 py-1 font-medium text-indigo-600 ring-1 ring-indigo-100">
                    {travelFromPrevious.departureTime} → {travelFromPrevious.arrivalTime}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <DragHandle
                  variant="place"
                  label={dragHandleLabel}
                  isDragging={isDragging}
                  attributes={attributes}
                  listeners={listeners}
                />
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {placeLocation.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {placeLocation.city}
                    {placeLocation.city && placeLocation.region ? ", " : ""}
                    {placeLocation.region}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                {rating ? (
                  <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-gray-800 shadow-sm ring-1 ring-gray-200">
                    <StarIcon />
                    <span>{rating.toFixed(1)}</span>
                    {reviewCount ? (
                      <span className="text-[11px] font-normal text-gray-500">
                        ({numberFormatter.format(reviewCount)})
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-red-600 shadow-sm ring-1 ring-red-200 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleDelete();
                  }}
                  aria-label={`Delete ${activity.title}`}
                >
                  Delete
                </button>
              </div>
            </div>

            {schedule ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                  Arrive {schedule.arrivalTime}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600">
                  Depart {schedule.departureTime}
                </span>
                {waitLabel ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                    {waitLabel}
                  </span>
                ) : null}
                {schedule.operatingWindow?.status === "outside" || isOutOfHours ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
                    Outside hours
                  </span>
                ) : null}
              </div>
            ) : null}
            {schedule?.operatingWindow?.note ? (
              <p className="text-xs text-gray-500">{schedule.operatingWindow.note}</p>
            ) : null}

            {summary ? (
              <p className="text-sm leading-relaxed text-gray-700">{summary}</p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-1">
              {placeLocation.category ? (
                <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                  {placeLocation.category}
                </span>
              ) : null}
              {durationLabel ? (
                <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                  Est. {durationLabel.replace("~", "")}
                </span>
              ) : null}
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleMoreInfo}
                className="rounded-full border border-indigo-200 px-3 py-1.5 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                More info
              </button>
            </div>
          </div>
          <div className="border-t border-gray-100 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-gray-900">Notes</p>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleToggleNotes();
                }}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                {notesOpen ? "Hide note" : "Add note"}
              </button>
            </div>
            {notesOpen ? (
              <div className="mt-3 space-y-2">
                <label htmlFor={notesId} className="text-sm font-medium text-gray-700">
                  {noteLabel}
                </label>
                <textarea
                  id={notesId}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  value={notesValue}
                  onChange={handleNotesChange}
                  placeholder="Add helpful details, reminders, or context for this activity."
                />
              </div>
            ) : null}
          </div>
        </div>
        <LocationDetailsModal
          location={detailsOpen ? placeLocation : null}
          onClose={() => setDetailsOpen(false)}
        />
      </li>
    );
  },
);

PlaceActivityRow.displayName = "PlaceActivityRow";

