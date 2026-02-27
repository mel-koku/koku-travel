"use client";

import Image from "next/image";
import { forwardRef, memo, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CSS } from "@dnd-kit/utilities";
import type { Transform } from "@dnd-kit/utilities";
import { Star, Clock, MapPin, Trash2, ArrowLeftRight } from "lucide-react";

import { useLocationDetailsQuery } from "@/hooks/useLocationDetailsQuery";
import type { ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import { useActivityLocation } from "@/hooks/useActivityLocations";
import {
  getShortOverview,
  getLocationRating,
  getLocationReviewCount,
} from "@/components/features/itinerary/activityUtils";
import { resizePhotoUrl } from "@/lib/google/transformations";
import type { ItineraryConflict } from "@/lib/validation/itineraryConflicts";
import { ConflictBadgeB } from "./ConflictBadgeB";
import { ActivityTipBadgeB } from "./ActivityTipB";
import { generateActivityTipsAsync, type ActivityTip } from "@/lib/tips/tipGenerator";

// B motion tokens
const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

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
    id: activity.locationId ?? `__fallback__${activity.id}`,
    name: activity.title,
    city: fallbackCity,
    region: fallbackCity,
    category: fallbackCategory,
    image: FALLBACK_IMAGES[fallbackCategory] ?? DEFAULT_FALLBACK_IMAGE,
  };
}

const STRIP_COLOR = "var(--primary)";

type PlaceActivityRowBProps = {
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
  conflicts?: ItineraryConflict[];
  hideDragHandle?: boolean;
  isReadOnly?: boolean;
  activeDragId?: string | null;
  onViewDetails?: (location: Location) => void;
};

export const PlaceActivityRowB = memo(
  forwardRef<HTMLDivElement, PlaceActivityRowBProps>(
    (
      {
        activity,
        allActivities: _allActivities = [],
        dayTimezone: _dayTimezone,
        onDelete,
        onUpdate: _onUpdate,
        attributes: _attributes,
        listeners: _listeners,
        isDragging,
        transform,
        transition,
        isSelected,
        onSelect,
        onHover,
        placeNumber,
        tripId: _tripId,
        dayId: _dayId,
        onReplace,
        conflicts,
        hideDragHandle: _hideDragHandle,
        isReadOnly,
        activeDragId,
        onViewDetails,
      },
      ref,
    ) => {
      const prefersReducedMotion = useReducedMotion();

      const dragStyles =
        transform || transition
          ? {
              transform: transform
                ? CSS.Transform.toString(transform)
                : undefined,
              transition: transition ?? undefined,
            }
          : undefined;

      // Fetch location data
      const isEntryPoint = activity.locationId?.startsWith("__entry_point_");
      const { location: fetchedLocation } = useActivityLocation(
        isEntryPoint ? null : activity,
      );
      const placeLocation = useMemo(
        () => fetchedLocation ?? buildFallbackLocation(activity),
        [activity, fetchedLocation],
      );
      const { details: locationDetails } = useLocationDetailsQuery(
        placeLocation?.id ?? null,
      );

      // Rating and summary
      const summary = placeLocation
        ? getShortOverview(
            placeLocation,
            locationDetails?.editorialSummary ?? null,
          )
        : null;
      const rating = placeLocation ? getLocationRating(placeLocation) : null;
      const reviewCount = placeLocation
        ? getLocationReviewCount(placeLocation)
        : null;

      // Duration label
      const durationLabel = useMemo(() => {
        if (!activity.durationMin) return null;
        const hours = activity.durationMin / 60;
        if (hours >= 1) {
          const rounded = Number.isInteger(hours)
            ? hours
            : Math.round(hours * 10) / 10;
          return `${rounded}h`;
        }
        return `${activity.durationMin}m`;
      }, [activity.durationMin]);

      // Activity tips
      const [tips, setTips] = useState<ActivityTip[]>([]);
      const activityId = activity.id;
      const placeLocationId = placeLocation?.id;

      useEffect(() => {
        if (placeLocation && activity.kind === "place") {
          generateActivityTipsAsync(activity, placeLocation).then(setTips).catch(() => {
            // Silently fail — tips are optional
          });
        }
      }, [activityId, placeLocationId]); // eslint-disable-line react-hooks/exhaustive-deps

      // Activity image
      const activityImage = useMemo(() => {
        const primaryPhoto = (
          placeLocation as Location & { primaryPhotoUrl?: string }
        )?.primaryPhotoUrl;
        if (primaryPhoto)
          return resizePhotoUrl(primaryPhoto, 800) ?? primaryPhoto;
        if (placeLocation?.image)
          return resizePhotoUrl(placeLocation.image, 800) ?? placeLocation.image;
        const category =
          placeLocation?.category ?? activity.tags?.[0] ?? "culture";
        return FALLBACK_IMAGES[category] ?? DEFAULT_FALLBACK_IMAGE;
      }, [placeLocation, activity.tags]);

      const [imageLoaded, setImageLoaded] = useState(false);
      const [imageError, setImageError] = useState(false);

      // Category strip color
      const stripColor = STRIP_COLOR;

      // Tags
      const displayTags = useMemo(() => {
        const tags: string[] = [];
        if (activity.mealType) {
          tags.push(
            activity.mealType.charAt(0).toUpperCase() +
              activity.mealType.slice(1),
          );
        }
        if (activity.tags?.length) {
          for (const t of activity.tags.slice(0, 2)) {
            const label = t.charAt(0).toUpperCase() + t.slice(1);
            if (!tags.includes(label)) tags.push(label);
          }
        }
        return tags.slice(0, 3);
      }, [activity.mealType, activity.tags]);

      const schedule = activity.schedule;
      const displayArrivalTime =
        activity.manualStartTime ?? schedule?.arrivalTime;

      const handleSelect = () => {
        onSelect?.(activity.id);
        if (placeLocation) onViewDetails?.(placeLocation);
      };

      const handleHover = () => {
        onHover?.(activity.id);
      };

      const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm(`Remove "${activity.title}" from this day?`)) {
          onDelete();
        }
      };

      const handleReplace = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onReplace?.();
      };

      // Has conflicts
      const hasConflicts = conflicts && conflicts.length > 0;

      // Compact drag mode: when another card is being dragged
      const isCompactDrag = Boolean(
        activeDragId && activeDragId !== activity.id,
      );

      if (isCompactDrag) {
        return (
          <div
            ref={ref}
            style={dragStyles}
            className="focus-visible:outline-none"
            data-kind="place"
            data-activity-id={activity.id}
          >
            <div
              className="flex items-center gap-2.5 rounded-2xl px-3 py-2"
              style={{
                backgroundColor: "var(--card)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              {/* Time */}
              <span
                className="shrink-0 text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                {displayArrivalTime ?? activity.timeOfDay ?? "\u2014"}
              </span>

              {/* Category dot */}
              <div
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: stripColor }}
              />

              {/* Title */}
              <span
                className="min-w-0 truncate text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                {activity.title}
              </span>

              {/* Number (right side) */}
              {placeNumber !== undefined && (
                <span
                  className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-[var(--card)]"
                  style={{ backgroundColor: stripColor }}
                >
                  {placeNumber}
                </span>
              )}
            </div>
          </div>
        );
      }

      return (
        <div
          ref={ref}
          style={dragStyles}
          className="focus-visible:outline-none"
          data-kind="place"
          data-selected={isSelected || undefined}
          data-activity-id={activity.id}
        >
          <div className="flex gap-3">
            {/* Card */}
            <motion.div
            layout={!prefersReducedMotion && !isDragging}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { layout: { duration: 0.3, ease: bEase } }
            }
            className={`group relative min-w-0 flex-1 overflow-hidden rounded-2xl transition-shadow duration-200 ${
              isDragging
                ? "rotate-1 scale-[1.02]"
                : isSelected
                  ? ""
                  : "hover:-translate-y-0.5"
            }`}
            style={{
              backgroundColor: "var(--card)",
              boxShadow: isDragging
                ? "var(--shadow-elevated)"
                : isSelected
                  ? "var(--shadow-elevated)"
                  : "var(--shadow-card)",
              outline: isSelected
                ? "2px solid var(--primary)"
                : undefined,
              outlineOffset: isSelected ? "-2px" : undefined,
              cursor: "pointer",
            }}
            tabIndex={0}
            onClick={handleSelect}
            onKeyDown={(e) => {
              const target = e.target as HTMLElement;
              if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
              )
                return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSelect();
              }
            }}
            onMouseEnter={handleHover}
            onFocus={handleHover}
          >
            {/* Content layout: content + thumbnail */}
            <div className="flex">
              {/* Main content */}
              <div className="min-w-0 flex-1 p-3 sm:p-4">
                {/* Top row: time + title (+ number/heart on mobile only) */}
                <div className="flex items-start gap-2.5">
                  {/* Time */}
                  <div className="shrink-0 pt-0.5">
                    {displayArrivalTime ? (
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "var(--foreground)" }}
                      >
                        {displayArrivalTime}
                      </span>
                    ) : (
                      <span
                        className="text-xs capitalize"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {activity.timeOfDay || "\u2014"}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Title */}
                    <h3
                      className="text-sm font-semibold leading-snug sm:text-base"
                      style={{ color: "var(--foreground)" }}
                    >
                      {activity.title}
                    </h3>

                    {/* Neighborhood */}
                    {activity.neighborhood && (
                      <div className="mt-0.5 flex items-center gap-1">
                        <MapPin
                          className="h-3 w-3 shrink-0"
                          style={{ color: "var(--muted-foreground)" }}
                        />
                        <span
                          className="text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {activity.neighborhood}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Number — mobile only (image overlay handles desktop) */}
                  {placeNumber !== undefined && (
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[var(--card)] sm:hidden"
                      style={{ backgroundColor: stripColor }}
                    >
                      {placeNumber}
                    </div>
                  )}

                </div>

                {/* Meta row: rating + duration + tags */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {/* Star rating */}
                  {rating && (
                    <span className="flex items-center gap-1 text-xs">
                      <Star
                        className="h-3.5 w-3.5"
                        style={{ color: "var(--warning)", fill: "var(--warning)" }}
                      />
                      <span
                        className="font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        {rating}
                      </span>
                      {reviewCount && (
                        <span style={{ color: "var(--muted-foreground)" }}>
                          ({reviewCount.toLocaleString()})
                        </span>
                      )}
                    </span>
                  )}

                  {/* Duration pill */}
                  {durationLabel && (
                    <span
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: "var(--surface)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      <Clock className="h-3 w-3" />
                      {durationLabel}
                    </span>
                  )}

                  {/* Category tag chips */}
                  {displayTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        backgroundColor: "var(--accent)",
                        color: "var(--primary)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Activity tips */}
                {tips.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {tips.slice(0, 2).map((tip, index) => (
                      <ActivityTipBadgeB key={index} tip={tip} />
                    ))}
                  </div>
                )}

                {/* Getting there — nearest station + Japanese name */}
                {(placeLocation?.nearestStation || placeLocation?.nameJapanese) && (
                  <div
                    className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {placeLocation.nearestStation && (
                      <span className="flex items-center gap-1">
                        <span>{"\uD83D\uDCCD"}</span>
                        {placeLocation.nearestStation}
                      </span>
                    )}
                    {placeLocation.nameJapanese && (
                      <span className="flex items-center gap-1">
                        <span>{"\uD83C\uDDEF\uD83C\uDDF5"}</span>
                        <span lang="ja">{placeLocation.nameJapanese}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Short description */}
                {summary && (
                  <p
                    className="mt-2 line-clamp-2 text-sm leading-relaxed"
                    style={{ color: "var(--foreground-body, var(--muted-foreground))" }}
                  >
                    {summary}
                  </p>
                )}

                {/* Conflict warning */}
                {hasConflicts && (
                  <div className="mt-2">
                    <ConflictBadgeB conflicts={conflicts!} variant="inline" />
                  </div>
                )}

                {/* Action row for non-read-only */}
                {!isReadOnly && (
                  <div className="mt-3 flex items-center gap-1 border-t pt-2" style={{ borderColor: "var(--border)" }}>
                    {onReplace && (
                      <button
                        type="button"
                        onClick={handleReplace}
                        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--surface)]"
                        style={{ color: "var(--muted-foreground)" }}
                        title="Find alternatives"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Replace</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--error)_10%,transparent)]"
                      style={{ color: "var(--muted-foreground)" }}
                      aria-label={`Delete ${activity.title}`}
                      title="Remove this activity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Thumbnail image */}
              <div className="relative hidden w-48 shrink-0 sm:block">
                {!imageLoaded && !imageError && (
                  <div
                    className="absolute inset-0 animate-pulse"
                    style={{ backgroundColor: "var(--surface)" }}
                  />
                )}
                <Image
                  src={
                    imageError
                      ? (FALLBACK_IMAGES[placeLocation?.category ?? "culture"] ??
                        DEFAULT_FALLBACK_IMAGE)
                      : activityImage
                  }
                  alt={activity.title}
                  fill
                  sizes="192px"
                  className={`object-cover transition-opacity duration-200 ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    setImageError(true);
                    setImageLoaded(true);
                  }}
                />

                {/* Number overlay on image */}
                {placeNumber !== undefined && (
                  <div className="absolute right-2 top-2 z-10">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-[var(--card)] shadow-[var(--shadow-sm)]"
                      style={{ backgroundColor: stripColor }}
                    >
                      {placeNumber}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          </div>
        </div>
      );
    },
  ),
);

PlaceActivityRowB.displayName = "PlaceActivityRowB";
