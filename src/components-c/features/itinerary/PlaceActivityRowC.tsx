"use client";

import Image from "next/image";
import { forwardRef, memo, useMemo, useState } from "react";
import type { Transform } from "@dnd-kit/utilities";
import { Star, Clock, MapPin, Trash2, ArrowLeftRight, PlaneLanding, PlaneTakeoff } from "lucide-react";

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
import { ConflictBadgeC } from "./ConflictBadgeC";

const FALLBACK_IMAGES: Record<string, string> = {
  culture: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1600&q=80",
  food: "https://images.unsplash.com/photo-1525708827920-7b83ba848008?auto=format&fit=crop&w=1600&q=80",
  nature: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
  shopping: "https://images.unsplash.com/photo-1508339716581-3657ca8caab1?auto=format&fit=crop&w=1600&q=80",
  view: "https://images.unsplash.com/photo-1528287341442-adaa7dc6b52c?auto=format&fit=crop&w=1600&q=80",
  hotel: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80",
  transport: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1600&q=80",
  entertainment: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1600&q=80",
  point_of_interest: "https://images.unsplash.com/photo-1480796927426-f609979314bd?auto=format&fit=crop&w=1600&q=80",
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

type PlaceActivityRowCProps = {
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
  tripMonth?: number;
  dayCityId?: string;
  tripStartDate?: string;
};

export const PlaceActivityRowC = memo(
  forwardRef<HTMLDivElement, PlaceActivityRowCProps>(
    function PlaceActivityRowC(
      {
        activity,
        onDelete,
        onUpdate: _onUpdate,
        isDragging,
        isSelected,
        onSelect,
        placeNumber,
        onReplace,
        conflicts,
        isReadOnly,
        activeDragId,
        onViewDetails,
      },
      ref,
    ) {
      const [imageError, setImageError] = useState(false);

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

      // Image
      const imageSrc = useMemo(() => {
        if (imageError) return DEFAULT_FALLBACK_IMAGE;
        const photoUrl = placeLocation?.image;
        if (photoUrl) {
          if (photoUrl.includes("googleusercontent")) {
            return resizePhotoUrl(photoUrl, 200) ?? photoUrl;
          }
          return photoUrl;
        }
        return DEFAULT_FALLBACK_IMAGE;
      }, [placeLocation?.image, imageError]);

      // Time
      const timeLabel = activity.manualStartTime ?? activity.schedule?.arrivalTime;
      const durationLabel = useMemo(() => {
        if (!activity.durationMin) return null;
        const hours = activity.durationMin / 60;
        if (hours >= 1) {
          const h = Math.floor(hours);
          const m = activity.durationMin % 60;
          return m > 0 ? `${h}h ${m}m` : `${h}h`;
        }
        return `${activity.durationMin} min`;
      }, [activity.durationMin]);

      // Rating
      const rating = placeLocation ? getLocationRating(placeLocation) : null;
      const reviewCount = placeLocation ? getLocationReviewCount(placeLocation) : null;

      // Description
      const overview = placeLocation
        ? getShortOverview(placeLocation, locationDetails?.editorialSummary ?? null)
        : null;

      // Station info
      const nearestStation = (placeLocation as Record<string, unknown>).nearest_station as string | undefined;
      const nameJapanese = (placeLocation as Record<string, unknown>).name_japanese as string | undefined;

      // Anchor (airport)
      const isAnchor = activity.isAnchor;
      const isArrival = isAnchor && activity.id?.startsWith("anchor-arrival");
      const isDeparture = isAnchor && activity.id?.startsWith("anchor-departure");

      const handleClick = () => {
        if (onSelect) onSelect(activity.id);
      };

      return (
        <div
          ref={ref}
          className={`group relative border transition-colors duration-150 ${
            isSelected
              ? "border-[var(--primary)]"
              : "border-[var(--border)]"
          } ${isDragging ? "opacity-50" : ""}`}
          style={{
            backgroundColor: "var(--card)",
          }}
          data-kind="place"
          data-activity-id={activity.id}
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick();
            }
          }}
        >
          {/* Selected indicator: left border accent */}
          {isSelected && (
            <div
              className="absolute left-0 top-0 bottom-0 w-[3px]"
              style={{ backgroundColor: "var(--primary)" }}
            />
          )}

          <div className="flex gap-3 p-3">
            {/* Thumbnail */}
            <div className="relative h-16 w-16 shrink-0 overflow-hidden">
              <Image
                src={imageSrc}
                alt={activity.title}
                fill
                className="object-cover"
                sizes="64px"
                onError={() => setImageError(true)}
              />
              {placeNumber != null && (
                <div
                  className="absolute top-0 left-0 flex h-5 w-5 items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  {placeNumber}
                </div>
              )}
              {isAnchor && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ backgroundColor: "color-mix(in srgb, var(--foreground) 40%, transparent)" }}
                >
                  {isArrival ? (
                    <PlaneLanding className="h-5 w-5 text-white" />
                  ) : isDeparture ? (
                    <PlaneTakeoff className="h-5 w-5 text-white" />
                  ) : null}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3
                    className="truncate text-sm font-bold tracking-[-0.02em]"
                    style={{ color: "var(--foreground)" }}
                  >
                    {activity.title}
                  </h3>

                  {/* Time + Duration */}
                  <div className="mt-0.5 flex items-center gap-2 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                    {timeLabel && (
                      <span className="flex items-center gap-1 font-bold">
                        <Clock className="h-3 w-3" />
                        {timeLabel}
                      </span>
                    )}
                    {durationLabel && (
                      <>
                        <span>·</span>
                        <span>{durationLabel}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!isReadOnly && !isAnchor && !activeDragId && (
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    {onReplace && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReplace();
                        }}
                        className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] active:scale-[0.98]"
                        style={{ color: "var(--muted-foreground)" }}
                        aria-label="Replace activity"
                        title="Replace"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                      className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-[color-mix(in_srgb,var(--error)_10%,transparent)] active:scale-[0.98]"
                      style={{ color: "var(--error)" }}
                      aria-label="Remove activity"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Rating */}
              {rating != null && rating > 0 && (
                <div className="mt-1 flex items-center gap-1.5">
                  <Star className="h-3 w-3 fill-current" style={{ color: "var(--warning)" }} />
                  <span className="text-[11px] font-bold" style={{ color: "var(--foreground)" }}>
                    {rating.toFixed(1)}
                  </span>
                  {reviewCount != null && reviewCount > 0 && (
                    <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                      ({reviewCount.toLocaleString()})
                    </span>
                  )}
                </div>
              )}

              {/* Description */}
              {overview && (
                <p
                  className="mt-1 text-xs leading-relaxed line-clamp-2"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {overview}
                </p>
              )}

              {/* Getting there (nearest station) */}
              {nearestStation && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span>{nearestStation}</span>
                  {nameJapanese && (
                    <span className="opacity-60">({nameJapanese})</span>
                  )}
                </div>
              )}

              {/* Conflicts */}
              {conflicts && conflicts.length > 0 && (
                <div className="mt-1.5">
                  <ConflictBadgeC conflicts={conflicts} variant="inline" />
                </div>
              )}

              {/* View details link */}
              {onViewDetails && placeLocation && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(placeLocation);
                  }}
                  className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:text-[var(--primary)] active:scale-[0.98]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  View Details
                </button>
              )}
            </div>
          </div>
        </div>
      );
    },
  ),
);
