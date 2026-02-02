"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
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
import {
  getShortOverview,
  getLocationRating,
  getLocationReviewCount,
  numberFormatter,
} from "./activityUtils";
import { logger } from "@/lib/logger";
import { generateActivityTipsAsync, type ActivityTip } from "@/lib/tips/tipGenerator";
import { ActivityConflictIndicator } from "./ConflictBadge";
import type { ItineraryConflict } from "@/lib/validation/itineraryConflicts";
import { getActivityColorScheme } from "@/lib/itinerary/activityColors";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Use stable IDs to prevent excessive re-fetching
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
        // Use async tip generation to include etiquette tips from database
        generateActivityTipsAsync(activity, placeLocation, {
          allActivities,
        }).then(setTips).catch(() => {
          // Silently fail - tips are optional
        });
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

    // Get color scheme based on activity type
    const colorScheme = useMemo(() => getActivityColorScheme(activity), [activity]);

    // Get the activity image
    const activityImage = useMemo(() => {
      // Try location's primary photo first
      const primaryPhoto = (placeLocation as Location & { primaryPhotoUrl?: string })?.primaryPhotoUrl;
      if (primaryPhoto) return primaryPhoto;
      // Then fall back to location image
      if (placeLocation?.image) return placeLocation.image;
      // Finally use category fallback
      const category = placeLocation?.category ?? activity.tags?.[0] ?? "culture";
      return FALLBACK_IMAGES[category] ?? DEFAULT_FALLBACK_IMAGE;
    }, [placeLocation, activity.tags]);

    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    // Check if this is an entry point for display purposes
    const isStartEntryPoint = activity.locationId?.startsWith("__entry_point_start__");
    const isEndEntryPoint = activity.locationId?.startsWith("__entry_point_end__");
    const displayLabel = isStartEntryPoint ? "S" : isEndEntryPoint ? "E" : placeNumber;

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
        <div className="flex gap-3">
          {/* Left: Time Column */}
          <div className="relative flex w-16 shrink-0 flex-col items-center pt-2">
            {displayArrivalTime ? (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setShowTimePicker(!showTimePicker);
                    setTempManualTime(activity.manualStartTime ?? schedule?.arrivalTime ?? "09:00");
                  }}
                  className={`text-sm font-bold transition hover:text-brand-primary ${
                    hasManualTime ? "text-sage" : "text-charcoal"
                  }`}
                  title={hasManualTime ? "Manual time - click to edit" : "Click to set time"}
                >
                  {displayArrivalTime}
                </button>
                {schedule?.departureTime && (
                  <>
                    <div className="my-0.5 h-4 w-px bg-border/50" />
                    <span className="text-[11px] text-stone">
                      {schedule.departureTime}
                    </span>
                  </>
                )}
                {hasManualTime && (
                  <span className="mt-0.5 text-[9px] font-medium uppercase text-sage">manual</span>
                )}
              </>
            ) : (
              <span className="text-[11px] text-stone capitalize">{activity.timeOfDay || "—"}</span>
            )}
            {/* Time picker popover */}
            {showTimePicker && (
              <div
                className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-border bg-background p-3 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="mb-2 text-xs font-medium text-warm-gray">Set time</p>
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

          {/* Right: Main Card */}
          <div
            className={`group relative flex-1 overflow-hidden rounded-2xl bg-white transition-all duration-200 ${
              isDragging
                ? "ring-2 ring-sage/30 shadow-lg rotate-1 scale-[1.02]"
                : isSelected
                  ? "ring-2 ring-brand-primary shadow-lg"
                  : "shadow-sm hover:shadow-lg hover:-translate-y-0.5"
            }`}
          >
            {/* Large Image Section - 16:9 aspect ratio */}
            <div className="relative aspect-video w-full overflow-hidden">
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 animate-pulse bg-stone-200" />
              )}
              <Image
                src={imageError ? (FALLBACK_IMAGES[placeLocation?.category ?? "culture"] ?? DEFAULT_FALLBACK_IMAGE) : activityImage}
                alt={activity.title}
                fill
                sizes="(max-width: 640px) 100vw, 600px"
                className={`object-cover transition-opacity duration-200 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(true);
                }}
              />
              {/* Gradient overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

              {/* Top overlay: Drag handle left, badges right */}
              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
                {/* Drag Handle */}
                {!hideDragHandle && (
                  <div className="rounded-lg bg-white/90 p-1 shadow-sm backdrop-blur-sm">
                    <DragHandle
                      variant="place"
                      label={dragHandleLabel}
                      isDragging={isDragging}
                      attributes={attributes}
                      listeners={listeners}
                    />
                  </div>
                )}
                {hideDragHandle && <div />}

                {/* Right badges: Number */}
                <div className="flex items-center gap-1.5">
                  {/* Number badge */}
                  {placeNumber !== undefined && (
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shadow-md ${colorScheme.badge} ${colorScheme.badgeText}`}
                      title={isStartEntryPoint ? "Starting point" : isEndEntryPoint ? "Ending point" : `Stop ${placeNumber}`}
                    >
                      {displayLabel}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="p-3 sm:p-4">
              {/* Title Row */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold leading-tight text-charcoal sm:text-lg">
                    {placeLocation.name}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-foreground-secondary">
                      {placeLocation.city}
                      {placeLocation.city && placeLocation.region && placeLocation.city !== placeLocation.region ? `, ${placeLocation.region}` : ""}
                    </span>
                    {rating ? (
                      <div className="flex items-center gap-0.5 text-[11px] font-medium text-charcoal">
                        <StarIcon />
                        <span>{rating.toFixed(1)}</span>
                        {reviewCount ? (
                          <span className="font-normal text-stone">
                            ({numberFormatter.format(reviewCount)})
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Tags Row */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {placeLocation.category ? (
                  <span className="inline-block rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-warm-gray capitalize">
                    {placeLocation.category}
                  </span>
                ) : null}
                {durationLabel ? (
                  <span className="inline-block rounded-full bg-sage/10 px-2 py-0.5 text-[11px] font-semibold text-sage">
                    {durationLabel.replace("~", "")}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={handleMoreInfo}
                  className="inline-flex items-center gap-1 rounded-full border border-sage/30 bg-white px-2 py-0.5 text-[11px] font-semibold text-sage shadow-sm transition hover:bg-sage/10"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  More info
                </button>
              </div>

              {/* Status Badges */}
              {(availabilityStatus || (schedule?.operatingWindow?.status === "outside") || isOutOfHours || waitLabel || (conflicts && conflicts.length > 0)) && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {availabilityStatus && availabilityStatus.status === "closed" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-semibold text-error">
                      Closed
                    </span>
                  )}
                  {availabilityStatus && availabilityStatus.status === "busy" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
                      Busy
                    </span>
                  )}
                  {(availabilityStatus?.status === "requires_reservation" || availabilityStatus?.reservationRequired) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
                      Reservation recommended
                    </span>
                  )}
                  {(schedule?.operatingWindow?.status === "outside" || isOutOfHours) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-semibold text-error">
                      Outside hours
                    </span>
                  )}
                  {waitLabel && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
                      {waitLabel}
                    </span>
                  )}
                  {conflicts && conflicts.length > 0 && (
                    <ActivityConflictIndicator conflicts={conflicts} />
                  )}
                </div>
              )}

              {/* Description */}
              {summary && (
                <p className="mt-3 text-xs leading-relaxed text-warm-gray line-clamp-2">{summary}</p>
              )}

              {/* Tips Section */}
              {tips.length > 0 && (
                <div className="mt-3 rounded-lg bg-sage/5 p-2.5">
                  <p className="mb-1.5 text-xs font-semibold text-charcoal">Tips</p>
                  <div className="space-y-1">
                    {tips.slice(0, 2).map((tip, index) => (
                      <div key={index} className="flex items-start gap-1.5 text-xs text-foreground-secondary">
                        <span className="shrink-0">{tip.icon ?? "💡"}</span>
                        <span>
                          <span className="font-medium">{tip.title}:</span> {tip.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Why this recommendation */}
              {activity.recommendationReason && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setReasoningOpen((prev) => !prev);
                    }}
                    className="flex w-full items-center justify-between text-left text-xs font-medium text-sage hover:text-sage/80"
                  >
                    <span>Why this place?</span>
                    <svg className={`h-4 w-4 transition-transform ${reasoningOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {reasoningOpen && (
                    <div className="mt-2 rounded-lg bg-surface/50 p-2 text-xs text-warm-gray">
                      <p className="font-medium">{activity.recommendationReason.primaryReason}</p>
                      {activity.recommendationReason.factors && activity.recommendationReason.factors.length > 0 && (
                        <ul className="mt-1 space-y-0.5 pl-3">
                          {activity.recommendationReason.factors.map((factor, idx) => (
                            <li key={idx} className="text-[11px] list-disc">
                              {factor.factor}
                              {factor.score !== undefined && (
                                <span className="text-stone"> ({factor.score})</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between border-t border-border/30 bg-surface/30 px-3 py-2 sm:px-4">
              {/* Left: Notes */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleToggleNotes();
                  }}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-foreground-secondary transition hover:bg-sage/10 hover:text-sage"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="hidden sm:inline">{notesOpen ? "Hide note" : "Add note"}</span>
                </button>
              </div>

              {/* Right: Edit Actions */}
              <div className="flex items-center gap-1">
                {tripId && dayId && onReplace && (
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-foreground-secondary transition hover:bg-sage/10 hover:text-sage"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onReplace();
                    }}
                    title="Find alternatives"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span className="hidden sm:inline">Replace</span>
                  </button>
                )}
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-foreground-secondary transition hover:bg-error/10 hover:text-error"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleDelete();
                  }}
                  aria-label={`Delete ${activity.title}`}
                  title="Remove this activity"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </div>
            </div>

            {/* Notes Section (collapsible) */}
            {notesOpen && (
              <div className="border-t border-border/30 bg-background/50 p-3">
                <label htmlFor={notesId} className="sr-only">
                  {noteLabel}
                </label>
                <textarea
                  id={notesId}
                  className="w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-warm-gray shadow-sm placeholder:text-stone/50 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary"
                  rows={2}
                  value={notesValue}
                  onChange={handleNotesChange}
                  placeholder="Add helpful details, reminders, or context..."
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
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

