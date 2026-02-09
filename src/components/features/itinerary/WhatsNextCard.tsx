"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import type { ItineraryActivity, ItineraryDay } from "@/types/itinerary";

export type WhatsNextCardProps = {
  day: ItineraryDay;
  tripStartDate: string;
  dayIndex: number;
  className?: string;
  onActivityClick?: (activityId: string) => void;
};

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
function parseTimeToMinutes(timeStr: string | undefined): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1] ?? "0", 10);
  const minutes = parseInt(match[2] ?? "0", 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

/**
 * Format minutes to relative time (e.g., "in 30 min", "now", "passed")
 */
function formatRelativeTime(minutesUntil: number): string {
  if (minutesUntil < -30) {
    return "passed";
  }
  if (minutesUntil < 0) {
    return "just now";
  }
  if (minutesUntil < 1) {
    return "now";
  }
  if (minutesUntil < 60) {
    return `in ${Math.round(minutesUntil)} min`;
  }
  const hours = Math.floor(minutesUntil / 60);
  const mins = Math.round(minutesUntil % 60);
  if (mins === 0) {
    return `in ${hours}h`;
  }
  return `in ${hours}h ${mins}m`;
}

/**
 * Get current activity and next activity based on current time
 */
function getActivityStatus(activities: ItineraryActivity[], currentTimeMinutes: number): {
  current: Extract<ItineraryActivity, { kind: "place" }> | null;
  next: Extract<ItineraryActivity, { kind: "place" }> | null;
  minutesUntilNext: number | null;
} {
  const placeActivities = activities.filter(
    (a): a is Extract<typeof a, { kind: "place" }> => a.kind === "place"
  );

  let current: typeof placeActivities[number] | null = null;
  let next: typeof placeActivities[number] | null = null;

  for (let i = 0; i < placeActivities.length; i++) {
    const activity = placeActivities[i];
    if (!activity) continue;

    const arrival = parseTimeToMinutes(activity.schedule?.arrivalTime);
    const departure = parseTimeToMinutes(activity.schedule?.departureTime);

    if (arrival === null) continue;

    // Check if we're currently at this activity
    if (
      departure !== null &&
      currentTimeMinutes >= arrival &&
      currentTimeMinutes <= departure
    ) {
      current = activity;
      // Next is the activity after current
      next = placeActivities[i + 1] ?? null;
      break;
    }

    // Check if this activity is upcoming
    if (arrival > currentTimeMinutes) {
      next = activity;
      break;
    }

    // If we passed this activity, check next one
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
 * Check if the given date is today
 */
function isToday(tripStartDate: string, dayIndex: number): boolean {
  try {
    const [year, month, day] = tripStartDate.split("-").map(Number);
    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
      return false;
    }

    const startDate = new Date(year, month - 1, day);
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + dayIndex);

    const today = new Date();
    return (
      dayDate.getFullYear() === today.getFullYear() &&
      dayDate.getMonth() === today.getMonth() &&
      dayDate.getDate() === today.getDate()
    );
  } catch {
    return false;
  }
}

/**
 * Shows "What's Next" card at the top of itinerary when viewing today.
 * Displays the next upcoming activity with time until it starts.
 */
export function WhatsNextCard({
  day,
  tripStartDate,
  dayIndex,
  className,
  onActivityClick,
}: WhatsNextCardProps) {
  // Only show for today
  const showCard = useMemo(
    () => isToday(tripStartDate, dayIndex),
    [tripStartDate, dayIndex]
  );

  // Get current time in minutes
  const currentTimeMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);

  // Get activity status
  const { current, next, minutesUntilNext } = useMemo(
    () => getActivityStatus(day.activities, currentTimeMinutes),
    [day.activities, currentTimeMinutes]
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

      {/* Running late option */}
      {minutesUntilNext !== null && minutesUntilNext <= 15 && minutesUntilNext > -15 && (
        <div className="mt-3 pt-3 border-t border-brand-primary/20">
          <p className="text-xs text-foreground-secondary">
            Running late? You can adjust the schedule or skip this activity.
          </p>
        </div>
      )}
    </div>
  );
}
