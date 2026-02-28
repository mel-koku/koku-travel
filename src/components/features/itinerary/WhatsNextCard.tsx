"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import type { ItineraryActivity, ItineraryDay } from "@/types/itinerary";
import {
  isToday,
  parseTimeToMinutes,
  formatRelativeTime,
  getCurrentMinutes,
} from "@/lib/itinerary/timeUtils";

export type WhatsNextCardProps = {
  day: ItineraryDay;
  tripStartDate: string;
  dayIndex: number;
  className?: string;
  onActivityClick?: (activityId: string) => void;
  onCheckIn?: (activityId: string) => void;
  checkedInIds?: Set<string>;
};

/**
 * Get current activity and next activity based on current time.
 * Skips activities that have been checked in.
 */
function getActivityStatus(
  activities: ItineraryActivity[],
  currentTimeMinutes: number,
  checkedInIds?: Set<string>,
): {
  current: Extract<ItineraryActivity, { kind: "place" }> | null;
  next: Extract<ItineraryActivity, { kind: "place" }> | null;
  minutesUntilNext: number | null;
} {
  const placeActivities = activities.filter(
    (a): a is Extract<typeof a, { kind: "place" }> =>
      a.kind === "place" && !checkedInIds?.has(a.id),
  );

  let current: (typeof placeActivities)[number] | null = null;
  let next: (typeof placeActivities)[number] | null = null;

  for (let i = 0; i < placeActivities.length; i++) {
    const activity = placeActivities[i];
    if (!activity) continue;

    const arrival = parseTimeToMinutes(activity.schedule?.arrivalTime);
    const departure = parseTimeToMinutes(activity.schedule?.departureTime);

    if (arrival === null) continue;

    if (
      departure !== null &&
      currentTimeMinutes >= arrival &&
      currentTimeMinutes <= departure
    ) {
      current = activity;
      next = placeActivities[i + 1] ?? null;
      break;
    }

    if (arrival > currentTimeMinutes) {
      next = activity;
      break;
    }

    if (departure !== null && currentTimeMinutes > departure) {
      continue;
    }
  }

  const minutesUntilNext =
    next && next.schedule?.arrivalTime
      ? (parseTimeToMinutes(next.schedule.arrivalTime) ?? 0) - currentTimeMinutes
      : null;

  return { current, next, minutesUntilNext };
}

/**
 * Build a Maps deeplink. Apple Maps on iOS, Google Maps otherwise.
 */
function buildMapsLink(title: string, coords?: { lat: number; lng: number }): string | null {
  if (!coords) return null;
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isIOS) {
    return `https://maps.apple.com/?q=${encodeURIComponent(title)}&ll=${coords.lat},${coords.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
}

/**
 * Shows "What's Next" card at the top of itinerary when viewing today.
 * Displays the next upcoming activity with time until it starts.
 * Updates live every 60 seconds.
 */
export function WhatsNextCard({
  day,
  tripStartDate,
  dayIndex,
  className,
  onActivityClick,
  onCheckIn,
  checkedInIds,
}: WhatsNextCardProps) {
  // Only show for today
  const showCard = useMemo(
    () => isToday(tripStartDate, dayIndex),
    [tripStartDate, dayIndex],
  );

  // Live-updating current time (60s interval)
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(getCurrentMinutes);
  useEffect(() => {
    if (!showCard) return;
    const interval = setInterval(() => setCurrentTimeMinutes(getCurrentMinutes()), 60_000);
    return () => clearInterval(interval);
  }, [showCard]);

  // Get activity status
  const { current, next, minutesUntilNext } = useMemo(
    () => getActivityStatus(day.activities, currentTimeMinutes, checkedInIds),
    [day.activities, currentTimeMinutes, checkedInIds],
  );

  const handleCheckIn = useCallback(
    (activityId: string) => {
      onCheckIn?.(activityId);
    },
    [onCheckIn],
  );

  if (!showCard) {
    return null;
  }

  // Day is over - all activities passed
  if (!current && !next) {
    return (
      <div
        className={cn(
          "rounded-xl border border-sage/30 bg-sage/10 p-4",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌙</span>
          <div>
            <p className="text-sm font-semibold text-foreground">Day complete!</p>
            <p className="text-xs text-foreground-secondary">
              All activities for today are done. Enjoy your evening!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Currently at an activity
  if (current && !next) {
    const mapsLink = buildMapsLink(current.title, current.coordinates);
    return (
      <div
        className={cn(
          "rounded-xl border border-sage/30 bg-sage/10 p-4",
          className
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl">📍</span>
            <div className="min-w-0">
              <p className="font-mono text-xs font-medium text-sage uppercase tracking-wide">
                You&apos;re at
              </p>
              <p className="text-sm font-semibold text-foreground truncate">
                {current.title}
              </p>
            </div>
          </div>
          {current.schedule?.departureTime && (
            <div className="text-right shrink-0">
              <p className="text-xs text-foreground-secondary">Until</p>
              <p className="font-mono text-sm font-semibold text-foreground">
                {current.schedule.departureTime}
              </p>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-sage/20">
          {mapsLink && (
            <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-sage hover:underline">
              Open in Maps
            </a>
          )}
          {onCheckIn && (
            <button type="button" onClick={() => handleCheckIn(current.id)} className="ml-auto text-xs font-medium text-sage hover:underline">
              Mark as visited
            </button>
          )}
        </div>
      </div>
    );
  }

  // Upcoming activity
  return (
    <div
      className={cn(
        "rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-4",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <span className="text-2xl">🎯</span>
            {minutesUntilNext !== null && minutesUntilNext <= 30 && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-primary opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-primary"></span>
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-mono text-xs font-medium text-brand-primary uppercase tracking-wide">
              What&apos;s next
            </p>
            <button
              type="button"
              onClick={() => next && onActivityClick?.(next.id)}
              className="text-sm font-semibold text-foreground truncate hover:text-brand-primary transition"
            >
              {next?.title}
            </button>
            {next?.neighborhood && (
              <p className="text-xs text-foreground-secondary">{next.neighborhood}</p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          {next?.schedule?.arrivalTime && (
            <>
              <p className="font-mono text-lg font-bold text-brand-primary">
                {next.schedule.arrivalTime}
              </p>
              {minutesUntilNext !== null && (
                <p className="font-mono text-xs text-foreground-secondary">
                  {formatRelativeTime(minutesUntilNext)}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Actions: Maps deeplink + check-in */}
      {next && (
        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-brand-primary/20">
          {(() => {
            const link = buildMapsLink(next.title, next.coordinates);
            return link ? (
              <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-primary hover:underline">
                Open in Maps
              </a>
            ) : null;
          })()}
          {current && onCheckIn && (
            <button type="button" onClick={() => handleCheckIn(current.id)} className="ml-auto text-xs font-medium text-sage hover:underline">
              Mark as visited
            </button>
          )}
          {minutesUntilNext !== null && minutesUntilNext <= 15 && minutesUntilNext > -15 && (
            <span className="text-xs text-foreground-secondary ml-auto">
              Running late? Adjust or skip.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
