"use client";

import dynamic from "next/dynamic";
import { forwardRef, memo, useMemo, useState, useEffect, type ChangeEvent, type MouseEvent } from "react";
import { CSS } from "@dnd-kit/utilities";
import type { Transform } from "@dnd-kit/utilities";

const LocationDetailsModal = dynamic(
  () => import("@/components/features/explore/LocationDetailsModal").then((m) => ({ default: m.LocationDetailsModal })),
  { ssr: false }
);
import { useLocationDetailsQuery } from "@/hooks/useLocationDetailsQuery";
import type { ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import { useActivityLocation } from "@/hooks/useActivityLocations";
import { DragHandle } from "./DragHandle";
import { StarIcon } from "./activityIcons";
import { ActivityActions } from "./ActivityActions";
import {
  getShortOverview,
  getLocationRating,
  getLocationReviewCount,
  numberFormatter,
} from "./activityUtils";
import { logger } from "@/lib/logger";
import { recordPreferenceEvent } from "@/lib/learning/preferenceStorage";
import { generateActivityTips, type ActivityTip } from "@/lib/tips/tipGenerator";
import { ActivityConflictIndicator } from "./ConflictBadge";
import type { ItineraryConflict } from "@/lib/validation/itineraryConflicts";

const FALLBACK_IMAGES: Record<string, string> = {
  culture:
    "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1600&q=80",
  food: "https://images.unsplash.com/photo-1525708827920-7b83ba848008?auto=format&fit=crop&w=1600&q=80",
  nature:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
  shopping:
    "https://images.unsplash.com/photo-1508339716581-3657ca8caab1?auto=format&fit=crop&w=1600&q=80",
  view: "https://images.unsplash.com/photo-1528287341442-adaa7dc6b52c?auto=format&fit=crop&w=1600&q=80",
  hotel:
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80",
  transport:
    "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1600&q=80",
  entertainment:
    "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1600&q=80",
  point_of_interest:
    "https://images.unsplash.com/photo-1480796927426-f609979314bd?auto=format&fit=crop&w=1600&q=80",
};

const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80";

function buildFallbackLocation(
  activity: Extract<ItineraryActivity, { kind: "place" }>,
): Location {
  const fallbackCategory = activity.tags?.[0] ?? "culture";
  const fallbackCity = activity.neighborhood ?? "Japan";

  return {
    // Use locationId if available, otherwise mark as fallback to prevent API calls
    id: activity.locationId ?? `__fallback__${activity.id}`,
    name: activity.title,
    city: fallbackCity,
    region: fallbackCity,
    category: fallbackCategory,
    image: FALLBACK_IMAGES[fallbackCategory] ?? DEFAULT_FALLBACK_IMAGE,
  };
}

/**
 * Extract city name from a formatted address string.
 * Attempts to find the city component, falling back to the activity's neighborhood or "Japan".
 */
function extractCityFromAddress(
  formattedAddress: string | undefined,
  fallbackNeighborhood: string | undefined,
): string {
  const fallback = fallbackNeighborhood ?? "Japan";
  if (!formattedAddress) {
    return fallback;
  }
  // Typical format: "Street, City, Prefecture, Japan" or "Location, City, Japan"
  // Split by comma and try to find a meaningful city component
  const parts = formattedAddress.split(",").map((p) => p.trim());
  // Usually city is second-to-last or third-to-last before "Japan"
  if (parts.length >= 3) {
    // Return the second-to-last part (typically city or prefecture)
    return parts[parts.length - 2] ?? fallback;
  }
  if (parts.length >= 2) {
    return parts[0] ?? fallback;
  }
  return fallback;
}

/**
 * Hook to fetch location details for entry points via Google Places API.
 * Uses the Basic tier endpoint (~$0.003/call) instead of Pro tier (~$0.017/call).
 */
function useEntryPointLocation(
  activity: Extract<ItineraryActivity, { kind: "place" }>,
): Location | null {
  const [location, setLocation] = useState<Location | null>(null);

  // Extract stable identifiers to prevent excessive re-fetching
  const locationId = activity.locationId;
  const activityId = activity.id;
  const neighborhood = activity.neighborhood;
  const fallbackCategory = activity.tags?.[0] ?? "transport";

  useEffect(() => {
    // Extract placeId from entry point locationId
    const placeIdMatch = locationId?.match(/^__entry_point_(?:start|end)__(.+?)__$/);
    const placeId = placeIdMatch ? placeIdMatch[1] : null;

    if (!placeId) {
      return;
    }

    const abortController = new AbortController();

    // Use Basic tier endpoint (4 fields) instead of Pro tier (35 fields)
    fetch(`/api/places/autocomplete?placeId=${encodeURIComponent(placeId)}`, {
      signal: abortController.signal,
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch place coordinates: ${res.status}`);
        }
        return res.json();
      })
      .then((data: { place?: { placeId: string; displayName: string; formattedAddress?: string; location: { latitude: number; longitude: number } } }) => {
        if (data.place) {
          const { place } = data;
          const city = extractCityFromAddress(place.formattedAddress, neighborhood);

          // Build Location object from Basic tier response
          const loc: Location = {
            id: place.placeId,
            name: place.displayName,
            city,
            region: city,
            category: fallbackCategory,
            image: FALLBACK_IMAGES[fallbackCategory] ?? DEFAULT_FALLBACK_IMAGE,
            placeId: place.placeId,
            coordinates: {
              lat: place.location.latitude,
              lng: place.location.longitude,
            },
          };
          setLocation(loc);
        }
      })
      .catch((error) => {
        // Ignore abort errors
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        logger.error(
          "Error fetching entry point location details",
          error instanceof Error ? error : new Error(String(error)),
          { activityId },
        );
        // Fall back to basic location
        setLocation(buildFallbackLocation(activity));
      });

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Use stable IDs to prevent excessive re-fetching
  }, [locationId, activityId, neighborhood, fallbackCategory]);

  return location;
}

type PlaceActivityRowProps = {
  activity: Extract<ItineraryActivity, { kind: "place" }>;
  allActivities?: ItineraryActivity[];
  dayTimezone?: string;
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
  placeNumber?: number;
  tripId?: string;
  dayId?: string;
  onReplace?: () => void;
  onCopy?: () => void;
  /** Conflicts detected for this activity */
  conflicts?: ItineraryConflict[];
  /** Hide the drag handle (for entry points) */
  hideDragHandle?: boolean;
};

export const PlaceActivityRow = memo(forwardRef<HTMLDivElement, PlaceActivityRowProps>(
  (
    {
      activity,
      allActivities = [],
      dayTimezone: _dayTimezone,
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
      placeNumber,
      tripId,
      dayId,
      onReplace,
      onCopy,
      conflicts,
      hideDragHandle,
    },
    ref,
  ) => {
    const [notesOpen, setNotesOpen] = useState(() => Boolean(activity.notes));
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [reasoningOpen, setReasoningOpen] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [tempManualTime, setTempManualTime] = useState(activity.manualStartTime ?? "");
    const [availabilityStatus, setAvailabilityStatus] = useState<{
      status: string;
      message?: string;
      reservationRequired?: boolean;
    } | null>(null);
    const [tips, setTips] = useState<ActivityTip[]>([]);

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

    // Check if this is an entry point that needs API fetch
    const isEntryPoint = activity.locationId?.startsWith("__entry_point_");
    const entryPointLocation = useEntryPointLocation(activity);

    // Fetch location data from database via API
    const { location: fetchedLocation } = useActivityLocation(
      isEntryPoint ? null : activity,
    );

    const placeLocation = useMemo(() => {
      if (isEntryPoint && entryPointLocation) {
        return entryPointLocation;
      }
      return fetchedLocation ?? buildFallbackLocation(activity);
    }, [activity, isEntryPoint, entryPointLocation, fetchedLocation]);
    const { details: locationDetails } = useLocationDetailsQuery(placeLocation?.id ?? null);

    // Check availability when location is available
    // Use stable identifiers to prevent excessive re-fetching
    const activityId = activity.id;
    const activityStartTime = activity.manualStartTime;
    const placeId = placeLocation?.placeId;

    useEffect(() => {
      // Use availability status from activity if available, otherwise check
      if (activity.availabilityStatus && activity.availabilityMessage) {
        setAvailabilityStatus({
          status: activity.availabilityStatus,
          message: activity.availabilityMessage,
        });
        return;
      }

      // Only check if we have a placeId
      if (!placeId || isEntryPoint) {
        return;
      }

      const abortController = new AbortController();

      // Check availability via API
      fetch("/api/itinerary/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activities: [activity] }),
        signal: abortController.signal,
      })
        .then((res) => {
          if (!res.ok) return null;
          return res.json();
        })
        .then((data) => {
          if (data?.results?.[0]) {
            const result = data.results[0];
            setAvailabilityStatus({
              status: result.status,
              message: result.message,
              reservationRequired: result.reservationRequired,
            });
          }
        })
        .catch((error) => {
          // Ignore abort errors
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }
          logger.warn("Failed to check availability", {
            activityId,
            error: error instanceof Error ? error.message : String(error),
          });
        });

      return () => {
        abortController.abort();
      };
    }, [activityId, activityStartTime, placeId, isEntryPoint, activity.availabilityStatus, activity.availabilityMessage]);

    // Generate tips when location is available
    // Use stable identifiers to prevent excessive re-computation
    const allActivityIds = useMemo(
      () => allActivities.map((a) => a.id).join(","),
      [allActivities]
    );
    const placeLocationId = placeLocation?.id;

    useEffect(() => {
      if (placeLocation && activity.kind === "place") {
        const generatedTips = generateActivityTips(activity, placeLocation, {
          allActivities,
        });
        setTips(generatedTips);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Use stable IDs to prevent excessive re-computation
    }, [activityId, placeLocationId, allActivityIds]);

    const summary = placeLocation
      ? getShortOverview(placeLocation, locationDetails?.editorialSummary ?? null)
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

    // Handle feedback (thumbs up/down)
    const handleFeedback = (type: "favorite" | "unfavorite" | "skip") => {
      // Use the already-fetched location
      if (!placeLocation) return;

      recordPreferenceEvent({
        type: type === "favorite" ? "favorite" : type === "skip" ? "skip" : "unfavorite",
        activityId: activity.id,
        locationId: placeLocation.id,
        location: placeLocation,
        timestamp: new Date().toISOString(),
      });
    };

    const notesId = `notes-${activity.id}`;
    const noteLabel = `Notes for ${activity.title}`;
    const notesValue = activity.notes ? activity.notes : "";

    // Manual time editing handlers
    const handleSetManualTime = () => {
      if (tempManualTime && /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(tempManualTime)) {
        onUpdate({ manualStartTime: tempManualTime } as Partial<ItineraryActivity>);
        setShowTimePicker(false);
      }
    };

    const handleClearManualTime = () => {
      onUpdate({ manualStartTime: undefined } as Partial<ItineraryActivity>);
      setTempManualTime("");
      setShowTimePicker(false);
    };

    const hasManualTime = Boolean(activity.manualStartTime);
    const displayArrivalTime = activity.manualStartTime ?? schedule?.arrivalTime;

    return (
      <div
        ref={ref}
        style={dragStyles}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
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
          className={`group relative overflow-hidden rounded-2xl border bg-background transition-all duration-200 ${
            isDragging
              ? "border-sage/30 ring-2 ring-sage/30 shadow-lg rotate-1 scale-[1.02]"
              : isSelected
                ? "border-brand-primary ring-2 ring-brand-primary shadow-lg"
                : "border-border shadow-sm hover:border-sage/20 hover:shadow-lg hover:-translate-y-0.5"
          }`}
        >
          <div className="p-3 space-y-1.5">

            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                {!hideDragHandle && (
                  <DragHandle
                    variant="place"
                    label={dragHandleLabel}
                    isDragging={isDragging}
                    attributes={attributes}
                    listeners={listeners}
                  />
                )}
                {placeNumber !== undefined ? (() => {
                  // Check if this is a start or end entry point
                  const isStartEntryPoint = activity.locationId?.startsWith("__entry_point_start__");
                  const isEndEntryPoint = activity.locationId?.startsWith("__entry_point_end__");

                  // Determine display label and color
                  const displayLabel = isStartEntryPoint ? "S" : isEndEntryPoint ? "E" : placeNumber;
                  const bgColor = isStartEntryPoint
                    ? "bg-emerald-500"
                    : isEndEntryPoint
                      ? "bg-rose-500"
                      : "bg-indigo-600";

                  return (
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm ring-2 ring-background ${bgColor}`}
                      title={isStartEntryPoint ? "Starting point" : isEndEntryPoint ? "Ending point" : `Stop ${placeNumber}`}
                    >
                      {displayLabel}
                    </div>
                  );
                })() : null}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-charcoal">
                    {placeLocation.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-xs text-foreground-secondary">
                      {placeLocation.city}
                      {placeLocation.city && placeLocation.region ? ", " : ""}
                      {placeLocation.region}
                    </p>
                    {rating ? (
                      <div className="flex shrink-0 items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-semibold text-charcoal shadow-sm ring-1 ring-border">
                        <StarIcon />
                        <span>{rating.toFixed(1)}</span>
                        {reviewCount ? (
                          <span className="text-[10px] font-normal text-stone">
                            ({numberFormatter.format(reviewCount)})
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {/* Feedback buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-full bg-background/95 p-1.5 text-foreground-secondary shadow-sm ring-1 ring-border transition hover:bg-success/10 hover:text-success active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleFeedback("favorite");
                    }}
                    aria-label={`Like ${activity.title}`}
                    title="Like this activity"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-background/95 p-1.5 text-foreground-secondary shadow-sm ring-1 ring-border transition hover:bg-error/10 hover:text-error active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleFeedback("skip");
                    }}
                    aria-label={`Skip ${activity.title}`}
                    title="Skip this activity"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {/* Quick Actions - Replace and Copy */}
                {tripId && dayId && onReplace && (
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-stone hover:bg-sage/10 hover:text-sage transition active:scale-[0.97]"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onReplace();
                    }}
                    aria-label="Find alternatives"
                    title="Find alternatives"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                )}
                {tripId && dayId && onCopy && (
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-stone hover:bg-sage/10 hover:text-sage transition active:scale-[0.97]"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onCopy();
                    }}
                    aria-label="Duplicate"
                    title="Duplicate"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                )}
                {tripId && dayId && (onReplace || onCopy) ? (
                  <ActivityActions
                    activity={activity}
                    tripId={tripId}
                    dayId={dayId}
                    onReplace={onReplace ?? (() => {})}
                    onDelete={handleDelete}
                    onCopy={onCopy ?? (() => {})}
                  />
                ) : (
                  <button
                    type="button"
                    className="rounded-full bg-background/95 px-2 py-0.5 text-[11px] font-semibold text-error shadow-sm ring-1 ring-error/30 transition hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleDelete();
                    }}
                    aria-label={`Delete ${activity.title}`}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {schedule || hasManualTime ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Arrival time with manual edit option */}
                <div className="relative inline-flex items-center">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setShowTimePicker(!showTimePicker);
                      setTempManualTime(activity.manualStartTime ?? schedule?.arrivalTime ?? "09:00");
                    }}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition hover:ring-2 hover:ring-sage/30 ${
                      hasManualTime
                        ? "bg-sage/10 text-sage"
                        : "bg-success/10 text-success"
                    }`}
                    title={hasManualTime ? "Manual time set - click to edit" : "Click to set manual time"}
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Arrive {displayArrivalTime}
                    {hasManualTime && <span className="ml-1 text-[9px] uppercase">Manual</span>}
                  </button>

                  {/* Time picker popover */}
                  {showTimePicker && (
                    <div
                      className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-border bg-background p-3 shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="mb-2 text-xs font-medium text-warm-gray">Set arrival time</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={tempManualTime}
                          onChange={(e) => setTempManualTime(e.target.value)}
                          className="rounded border border-border px-2 py-1 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                        <button
                          type="button"
                          onClick={handleSetManualTime}
                          className="rounded bg-brand-primary px-2 py-1 text-xs font-medium text-white hover:bg-brand-primary/90"
                        >
                          Set
                        </button>
                      </div>
                      {hasManualTime && (
                        <button
                          type="button"
                          onClick={handleClearManualTime}
                          className="mt-2 text-xs text-stone hover:text-error"
                        >
                          Reset to auto
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <span className="inline-flex items-center gap-1 rounded-full bg-sage/10 px-2 py-0.5 text-[11px] font-semibold text-sage">
                  Depart {schedule?.departureTime ?? "—"}
                </span>
                {waitLabel ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
                    {waitLabel}
                  </span>
                ) : null}
                {schedule?.operatingWindow?.status === "outside" || isOutOfHours ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-semibold text-error">
                    Outside hours
                  </span>
                ) : null}
              </div>
            ) : null}
            {schedule?.operatingWindow?.note ? (
              <p className="text-[11px] text-stone">{schedule.operatingWindow.note}</p>
            ) : null}
            {availabilityStatus && availabilityStatus.status !== "open" && availabilityStatus.status !== "unknown" ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {availabilityStatus.status === "closed" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-semibold text-error">
                    ⚠️ Closed
                  </span>
                ) : availabilityStatus.status === "busy" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
                    ⚠️ Busy
                  </span>
                ) : availabilityStatus.status === "requires_reservation" || availabilityStatus.reservationRequired ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
                    📞 Reservation recommended
                  </span>
                ) : null}
                {availabilityStatus.message ? (
                  <p className="text-[11px] text-foreground-secondary">{availabilityStatus.message}</p>
                ) : null}
              </div>
            ) : null}

            {/* Conflict Indicators */}
            {conflicts && conflicts.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <ActivityConflictIndicator conflicts={conflicts} />
              </div>
            )}

            {tips.length > 0 ? (
              <div className="space-y-1.5 rounded-lg bg-sage/5 p-2">
                <p className="text-xs font-semibold text-charcoal">💡 Tips:</p>
                {tips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs text-foreground-secondary">
                    <span className="mt-0.5">{tip.icon ?? "•"}</span>
                    <div className="flex-1">
                      <span className="font-medium">{tip.title}:</span>{" "}
                      <span>{tip.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {summary ? (
              <p className="text-xs leading-relaxed text-warm-gray line-clamp-2">{summary}</p>
            ) : null}
            {activity.recommendationReason ? (
              <div className="border-t border-border/50 pt-2 mt-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setReasoningOpen((prev) => !prev);
                  }}
                  className="flex w-full items-center justify-between text-left text-xs font-medium text-sage hover:text-sage/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  <span>Why this recommendation?</span>
                  <span className="text-stone">{reasoningOpen ? "−" : "+"}</span>
                </button>
                {reasoningOpen ? (
                  <div className="mt-2 space-y-2 text-xs text-warm-gray">
                    <p className="font-medium">{activity.recommendationReason.primaryReason}</p>
                    {activity.recommendationReason.factors && activity.recommendationReason.factors.length > 0 ? (
                      <div className="space-y-1">
                        <p className="font-semibold text-charcoal">Scoring breakdown:</p>
                        <ul className="space-y-1 pl-2">
                          {activity.recommendationReason.factors.map((factor, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-stone">•</span>
                              <span>
                                <span className="font-medium">{factor.factor}</span>
                                {factor.score !== undefined && (
                                  <span className="text-stone"> ({factor.score} pts)</span>
                                )}
                                {factor.reasoning && (
                                  <span className="text-foreground-secondary">: {factor.reasoning}</span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-1.5">
              {placeLocation.category ? (
                <span className="inline-block rounded-full bg-surface px-2 py-0.5 text-[11px] text-warm-gray">
                  {placeLocation.category}
                </span>
              ) : null}
              {durationLabel ? (
                <span className="inline-block rounded-full bg-sage/10 px-2 py-0.5 text-[11px] font-semibold text-sage">
                  Est. {durationLabel.replace("~", "")}
                </span>
              ) : null}
              <button
                type="button"
                onClick={handleMoreInfo}
                className="inline-flex items-center rounded-full border border-sage/30 px-2 py-0.5 text-[11px] font-semibold text-sage shadow-sm transition hover:bg-sage/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                More info
              </button>
            </div>
          </div>
          <div className="border-t border-border/50 bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-charcoal">Notes</p>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleToggleNotes();
                }}
                className="text-xs font-medium text-sage hover:text-sage/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                {notesOpen ? "Hide note" : "Add note"}
              </button>
            </div>
            {notesOpen ? (
              <div className="mt-2 space-y-1.5">
                <label htmlFor={notesId} className="text-xs font-medium text-warm-gray">
                  {noteLabel}
                </label>
                <textarea
                  id={notesId}
                  className="w-full rounded-lg border border-border px-2.5 py-1.5 text-xs text-warm-gray shadow-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary"
                  rows={2}
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
      </div>
    );
  },
));

PlaceActivityRow.displayName = "PlaceActivityRow";

