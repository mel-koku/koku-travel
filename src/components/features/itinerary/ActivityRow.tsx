'use client';

import {
  forwardRef,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type TouchEvent,
} from "react";
import { CSS } from "@dnd-kit/utilities";
import type { Transform } from "@dnd-kit/utilities";

import { LocationDetailsModal } from "@/components/features/explore/LocationDetailsModal";
import { LOCATION_EDITORIAL_SUMMARIES } from "@/data/locationEditorialSummaries";
import { useLocationEditorialSummary } from "@/state/locationDetailsStore";
import { ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import { findLocationForActivity } from "@/lib/itineraryLocations";

type ActivityRowProps = {
  activity: ItineraryActivity;
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

const TIME_OF_DAY_LABEL: Record<
  ItineraryActivity["timeOfDay"],
  string
> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

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

type DragHandleListeners = {
  onKeyDown?: (event: React.KeyboardEvent<Element>) => void;
  onPointerDown?: (event: React.PointerEvent<Element>) => void;
  onPointerUp?: (event: React.PointerEvent<Element>) => void;
  onMouseDown?: (event: React.MouseEvent<Element>) => void;
  onMouseUp?: (event: React.MouseEvent<Element>) => void;
  onTouchStart?: (event: React.TouchEvent<Element>) => void;
  onTouchEnd?: (event: React.TouchEvent<Element>) => void;
};

function buildFallbackLocation(activity: Extract<ItineraryActivity, { kind: "place" }>): Location {
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
      isSelected,
      onSelect,
      onHover,
    },
    ref,
  ) => {
    const isNote = activity.kind === "note";
    const noteActivity = isNote ? activity : null;
    const placeActivity = activity.kind === "place" ? activity : null;
    const [notesOpen, setNotesOpen] = useState(
      () => isNote || Boolean(activity.notes),
    );
    const [detailsOpen, setDetailsOpen] = useState(false);
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

    const placeLocation = useMemo(() => {
      if (!placeActivity) {
        return null;
      }
      const resolved = findLocationForActivity(placeActivity);
      return resolved ?? buildFallbackLocation(placeActivity);
    }, [placeActivity]);
    const cachedEditorialSummary = useLocationEditorialSummary(placeLocation?.id);
    const summary = placeLocation
      ? getShortOverview(placeLocation, cachedEditorialSummary)
      : null;
    const rating = placeLocation ? getLocationRating(placeLocation) : null;
    const reviewCount = placeLocation
      ? getLocationReviewCount(placeLocation)
      : null;

    const dragHandleLabel = isNote
      ? `Drag to reorder note for ${TIME_OF_DAY_LABEL[activity.timeOfDay]}`
      : `Drag to reorder ${activity.title}`;

    const dragAttributeProps = (attributes ?? {}) as Record<string, unknown>;
    const dragHandleListeners = useMemo(() => {
      const typed = (listeners ?? {}) as DragHandleListeners;
      return {
        onKeyDown: typed.onKeyDown
          ? (event: KeyboardEvent<HTMLButtonElement>) => {
              typed.onKeyDown?.(event);
            }
          : undefined,
        onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          typed.onPointerDown?.(event);
        },
        onPointerUp: typed.onPointerUp
          ? (event: PointerEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              typed.onPointerUp?.(event);
            }
          : undefined,
        onMouseDown: typed.onMouseDown
          ? (event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              typed.onMouseDown?.(event);
            }
          : undefined,
        onMouseUp: typed.onMouseUp
          ? (event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              typed.onMouseUp?.(event);
            }
          : undefined,
        onTouchStart: typed.onTouchStart
          ? (event: TouchEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              typed.onTouchStart?.(event);
            }
          : undefined,
        onTouchEnd: typed.onTouchEnd
          ? (event: TouchEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              typed.onTouchEnd?.(event);
            }
          : undefined,
      };
    }, [listeners]);

    const renderDragHandle = (variant: "place" | "note") => {
      const baseClasses =
        "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm transition cursor-grab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 data-[dragging=true]:cursor-grabbing";
      const placeClasses =
        "border-indigo-200 bg-white/95 text-indigo-600 hover:bg-indigo-50";
      const noteClasses =
        "border-indigo-200 bg-indigo-100 text-indigo-700 hover:bg-indigo-200";

      return (
        <button
          type="button"
          aria-label={dragHandleLabel}
          data-dragging={isDragging}
          className={`${baseClasses} ${variant === "place" ? placeClasses : noteClasses}`}
          {...dragAttributeProps}
          {...dragHandleListeners}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <GripIcon />
          <span>Drag</span>
        </button>
      );
    };

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

    if (placeActivity && placeLocation) {
      const handleMoreInfo = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setDetailsOpen(true);
      };

      const schedule = placeActivity?.schedule;
      const travelFromPrevious = placeActivity?.travelFromPrevious;
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
                  {renderDragHandle("place")}
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
                <p className="text-xs text-gray-500">
                  {schedule.operatingWindow.note}
                </p>
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
                  <label
                    htmlFor={notesId}
                    className="text-sm font-medium text-gray-700"
                  >
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
    }

    return (
      <li
        ref={ref}
        style={dragStyles}
        className={`rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/80 p-4 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${isDragging ? "ring-2 ring-indigo-300 shadow-md" : ""}`}
        data-kind="note"
        data-activity-id={activity.id}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {renderDragHandle("note")}
            <span className="text-sm font-semibold text-indigo-700">
              {noteActivity?.title ?? "Note"}
            </span>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleDelete();
            }}
            className="text-sm font-semibold text-red-600 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            aria-label={`Delete note for ${TIME_OF_DAY_LABEL[activity.timeOfDay]}`}
          >
            Delete
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-2 rounded-xl bg-white/60 p-3 shadow-sm">
            <span className="text-sm font-medium text-gray-700">Time (optional)</span>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor={noteStartId} className="text-xs font-medium text-gray-600">
                  Start time
                </label>
                <input
                  id={noteStartId}
                  type="time"
                  className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <label htmlFor={noteEndId} className="text-xs font-medium text-gray-600">
                  End time
                </label>
                <input
                  id={noteEndId}
                  type="time"
                  className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              <p id={timeErrorId} className="text-sm text-red-600">
                End time must be after start time.
              </p>
            ) : null}
            {noteStartTime && noteEndTime ? (
              <p className="text-sm font-medium text-gray-600">
                {`${noteStartTime} – ${noteEndTime}`}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={notesId} className="text-sm font-semibold text-gray-700">
              {noteLabel}
            </label>
            <textarea
              id={notesId}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              rows={3}
              value={notesValue}
              onChange={handleNotesChange}
              placeholder="Add reminders, tips, or context for this part of the day."
            />
          </div>
        </div>
      </li>
    );
  },
);

ActivityRow.displayName = "ActivityRow";

const numberFormatter = new Intl.NumberFormat("en-US");

const CATEGORY_DESCRIPTORS: Record<string, string> = {
  culture: "Historic cultural landmark",
  food: "Favorite spot for local flavors",
  nature: "Outdoor escape with scenic views",
  shopping: "Bustling shopping stop",
  view: "Panoramic viewpoint worth the stop",
};

function getShortOverview(location: Location, cachedSummary: string | null): string {
  const trimmedCachedSummary = cachedSummary?.trim();
  if (trimmedCachedSummary) {
    return trimmedCachedSummary;
  }
  const editorialSummary = LOCATION_EDITORIAL_SUMMARIES[location.id]?.trim();
  if (editorialSummary) {
    return editorialSummary;
  }
  if (location.shortDescription && location.shortDescription.trim().length > 0) {
    return location.shortDescription.trim();
  }

  const descriptor =
    CATEGORY_DESCRIPTORS[location.category?.toLowerCase() ?? ""] ?? "Notable experience";
  const cityPiece = location.city ? ` in ${location.city}` : "";

  const details: string[] = [];
  if (location.minBudget) {
    details.push(`Budget ${location.minBudget}`);
  }
  if (location.estimatedDuration) {
    details.push(`Plan for ${location.estimatedDuration}`);
  }

  const detailsSentence = details.length > 0 ? ` ${details.join(" • ")}` : "";

  return `${descriptor}${cityPiece}.${detailsSentence || " Easily fits into most itineraries."}`;
}

function getLocationRating(location: Location): number | null {
  const baseValue = Number.isFinite(location.rating)
    ? clamp(location.rating as number, 0, 5)
    : generateRatingFromId(location.id);

  return baseValue ? Math.round(baseValue * 10) / 10 : null;
}

function getLocationReviewCount(location: Location): number | null {
  if (Number.isInteger(location.reviewCount) && (location.reviewCount as number) > 0) {
    return location.reviewCount as number;
  }
  return generateReviewCountFromId(location.id);
}

function generateRatingFromId(seed: string): number {
  const hash = hashString(seed);
  const rating = 3.9 + (hash % 18) / 20; // 3.9 - 4.8 range
  return clamp(rating, 0, 5);
}

function generateReviewCountFromId(seed: string): number {
  const hash = hashString(seed);
  return 120 + (hash % 780) + Math.floor(hash % 4) * 100;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function StarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 text-amber-500"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
    </svg>
  );
}

function GripIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4 text-indigo-500"
      fill="currentColor"
    >
      <path d="M5 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2ZM15 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
    </svg>
  );
}


