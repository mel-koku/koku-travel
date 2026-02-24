"use client";

import Image from "next/image";
import { forwardRef, memo, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CSS } from "@dnd-kit/utilities";
import type { Transform } from "@dnd-kit/utilities";
import { Heart, Star, Clock, MapPin, Trash2, ArrowLeftRight } from "lucide-react";

import { useLocationDetailsQuery } from "@/hooks/useLocationDetailsQuery";
import type { ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import { useActivityLocation } from "@/hooks/useActivityLocations";
import { useSaved } from "@/context/SavedContext";
import {
  getShortOverview,
  getLocationRating,
  getLocationReviewCount,
} from "@/components/features/itinerary/activityUtils";
// getActivityColorScheme available from "@/lib/itinerary/activityColors" if needed
import { resizePhotoUrl } from "@/lib/google/transformations";
import type { ItineraryConflict } from "@/lib/validation/itineraryConflicts";

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

/** Map activity color scheme keys to B-friendly hex colors for the category strip */
const CATEGORY_STRIP_COLORS: Record<string, string> = {
  // Meals
  breakfast: "#D97706",
  lunch: "#D97706",
  dinner: "#D97706",
  snack: "#D97706",
  restaurant: "#D97706",
  cafe: "#D97706",
  // Culture
  culture: "#2D4B8E",
  view: "#2D4B8E",
  point_of_interest: "#2D4B8E",
  landmark: "#2D4B8E",
  shrine: "#2D4B8E",
  temple: "#2D4B8E",
  museum: "#2D4B8E",
  // Nature
  nature: "#059669",
  park: "#059669",
  garden: "#059669",
  onsen: "#059669",
  wellness: "#059669",
  // Shopping
  shopping: "#D97706",
  market: "#D97706",
  // Entertainment
  entertainment: "#D97706",
  bar: "#D97706",
  // Default
  default: "#2D4B8E",
};

function getCategoryStripColor(
  activity: Extract<ItineraryActivity, { kind: "place" }>,
): string {
  if (activity.mealType) {
    return CATEGORY_STRIP_COLORS[activity.mealType] ?? CATEGORY_STRIP_COLORS.default!;
  }
  const tag = activity.tags?.[0]?.toLowerCase();
  if (tag) {
    return CATEGORY_STRIP_COLORS[tag] ?? CATEGORY_STRIP_COLORS.default!;
  }
  return CATEGORY_STRIP_COLORS.default!;
}

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
      const { isInSaved, toggleSave } = useSaved();

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
      const stripColor = getCategoryStripColor(activity);

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

      // Save state
      const locationId = placeLocation?.id;
      const isSaved = locationId ? isInSaved(locationId) : false;

      const handleSelect = () => {
        onSelect?.(activity.id);
        if (placeLocation) onViewDetails?.(placeLocation);
      };

      const handleHover = () => {
        onHover?.(activity.id);
      };

      const handleSaveToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (locationId) toggleSave(locationId);
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
                className="w-12 shrink-0 text-right text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                {displayArrivalTime ?? activity.timeOfDay ?? "\u2014"}
              </span>

              {/* Category dot */}
              <div
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: stripColor }}
              />

              {/* Number */}
              {placeNumber !== undefined && (
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: stripColor }}
                >
                  {placeNumber}
                </span>
              )}

              {/* Title */}
              <span
                className="min-w-0 truncate text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                {activity.title}
              </span>

              {/* Neighborhood */}
              {activity.neighborhood && (
                <span
                  className="ml-auto shrink-0 text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {activity.neighborhood}
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
          <motion.div
            layout={!prefersReducedMotion && !isDragging}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { layout: { duration: 0.3, ease: bEase } }
            }
            className={`group relative overflow-hidden rounded-2xl transition-shadow duration-200 ${
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
            {/* Content layout: category strip + content + thumbnail */}
            <div className="flex">
              {/* Left: Category color strip */}
              <div
                className="w-[3px] shrink-0 rounded-l-2xl"
                style={{ backgroundColor: stripColor }}
              />

              {/* Middle: Main content */}
              <div className="min-w-0 flex-1 p-3 sm:p-4">
                {/* Top row: number + title + neighborhood */}
                <div className="flex items-start gap-2.5">
                  {/* Row number circle */}
                  {placeNumber !== undefined && (
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: stripColor }}
                    >
                      {placeNumber}
                    </div>
                  )}

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

                  {/* Heart save icon */}
                  {locationId && !isEntryPoint && (
                    <button
                      type="button"
                      onClick={handleSaveToggle}
                      className="shrink-0 rounded-full p-1 transition-colors hover:bg-[var(--surface)]"
                      aria-label={
                        isSaved ? "Remove from saved" : "Save for trip"
                      }
                    >
                      <Heart
                        className="h-4 w-4 transition-colors"
                        style={{
                          color: isSaved ? "var(--error)" : "var(--muted-foreground)",
                          fill: isSaved ? "var(--error)" : "none",
                        }}
                      />
                    </button>
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

                  {/* Time pill */}
                  {displayArrivalTime && (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: "var(--surface)",
                        color: "var(--foreground)",
                      }}
                    >
                      {displayArrivalTime}
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
                  <div
                    className="mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--warning) 10%, transparent)",
                      color: "var(--warning)",
                    }}
                  >
                    <svg
                      className="h-3.5 w-3.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    {conflicts![0]!.message}
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
              </div>
            </div>
          </motion.div>
        </div>
      );
    },
  ),
);

PlaceActivityRowB.displayName = "PlaceActivityRowB";
