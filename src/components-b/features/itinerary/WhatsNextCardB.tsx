"use client";

import { useMemo } from "react";
import { MapPin, Target, Moon } from "lucide-react";
import type { ItineraryActivity, ItineraryDay } from "@/types/itinerary";
import { RunningLatePopoverB } from "./RunningLatePopoverB";

export type WhatsNextCardBProps = {
  day: ItineraryDay;
  tripStartDate: string;
  dayIndex: number;
  className?: string;
  onActivityClick?: (activityId: string) => void;
  onDelayRemaining?: (delayMinutes: number) => void;
};

function parseTimeToMinutes(timeStr: string | undefined): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1] ?? "0", 10);
  const minutes = parseInt(match[2] ?? "0", 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function formatRelativeTime(minutesUntil: number): string {
  if (minutesUntil < -30) return "passed";
  if (minutesUntil < 0) return "just now";
  if (minutesUntil < 1) return "now";
  if (minutesUntil < 60) return `in ${Math.round(minutesUntil)} min`;
  const hours = Math.floor(minutesUntil / 60);
  const mins = Math.round(minutesUntil % 60);
  return mins === 0 ? `in ${hours}h` : `in ${hours}h ${mins}m`;
}

function isToday(tripStartDate: string, dayIndex: number): boolean {
  try {
    const [year, month, day] = tripStartDate.split("-").map(Number);
    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) return false;
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

function getActivityStatus(activities: ItineraryActivity[], currentTimeMinutes: number) {
  const placeActivities = activities.filter(
    (a): a is Extract<typeof a, { kind: "place" }> => a.kind === "place",
  );
  let current: (typeof placeActivities)[number] | null = null;
  let next: (typeof placeActivities)[number] | null = null;

  for (let i = 0; i < placeActivities.length; i++) {
    const activity = placeActivities[i];
    if (!activity) continue;
    const arrival = parseTimeToMinutes(activity.schedule?.arrivalTime);
    const departure = parseTimeToMinutes(activity.schedule?.departureTime);
    if (arrival === null) continue;

    if (departure !== null && currentTimeMinutes >= arrival && currentTimeMinutes <= departure) {
      current = activity;
      next = placeActivities[i + 1] ?? null;
      break;
    }
    if (arrival > currentTimeMinutes) {
      next = activity;
      break;
    }
    if (departure !== null && currentTimeMinutes > departure) continue;
  }

  const minutesUntilNext =
    next?.schedule?.arrivalTime
      ? (parseTimeToMinutes(next.schedule.arrivalTime) ?? 0) - currentTimeMinutes
      : null;

  return { current, next, minutesUntilNext };
}

export function WhatsNextCardB({
  day,
  tripStartDate,
  dayIndex,
  className,
  onActivityClick,
  onDelayRemaining,
}: WhatsNextCardBProps) {
  const showCard = useMemo(() => isToday(tripStartDate, dayIndex), [tripStartDate, dayIndex]);
  const currentTimeMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);
  const { current, next, minutesUntilNext } = useMemo(
    () => getActivityStatus(day.activities, currentTimeMinutes),
    [day.activities, currentTimeMinutes],
  );

  if (!showCard) return null;

  // Day complete
  if (!current && !next) {
    return (
      <div
        className={`rounded-2xl p-4 ${className ?? ""}`}
        style={{
          backgroundColor: "color-mix(in srgb, var(--success) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--success) 20%, transparent)",
        }}
      >
        <div className="flex items-center gap-3">
          <Moon className="h-6 w-6" style={{ color: "var(--success)" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Day complete!
            </p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
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
        className={`rounded-2xl p-4 ${className ?? ""}`}
        style={{
          backgroundColor: "color-mix(in srgb, var(--success) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--success) 20%, transparent)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <MapPin className="h-6 w-6 shrink-0" style={{ color: "var(--success)" }} />
            <div className="min-w-0">
              <p
                className="text-xs font-medium uppercase tracking-[0.15em]"
                style={{ color: "var(--success)" }}
              >
                You&apos;re at
              </p>
              <p
                className="truncate text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                {current.title}
              </p>
            </div>
          </div>
          {current.schedule?.departureTime && (
            <div className="shrink-0 text-right">
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                Until
              </p>
              <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                {current.schedule.departureTime}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Upcoming
  return (
    <div
      className={`rounded-2xl p-4 ${className ?? ""}`}
      style={{
        backgroundColor: "color-mix(in srgb, var(--primary) 6%, transparent)",
        border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative">
            <Target className="h-6 w-6" style={{ color: "var(--primary)" }} />
            {minutesUntilNext !== null && minutesUntilNext <= 30 && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                  style={{ backgroundColor: "var(--primary)" }}
                />
                <span
                  className="relative inline-flex h-3 w-3 rounded-full"
                  style={{ backgroundColor: "var(--primary)" }}
                />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p
              className="text-xs font-medium uppercase tracking-[0.15em]"
              style={{ color: "var(--primary)" }}
            >
              What&apos;s next
            </p>
            <button
              type="button"
              onClick={() => next && onActivityClick?.(next.id)}
              className="truncate text-sm font-semibold transition-colors"
              style={{ color: "var(--foreground)" }}
            >
              {next?.title}
            </button>
            {next?.neighborhood && (
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {next.neighborhood}
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          {next?.schedule?.arrivalTime && (
            <>
              <p
                className="text-lg font-bold"
                style={{ color: "var(--primary)" }}
              >
                {next.schedule.arrivalTime}
              </p>
              {minutesUntilNext !== null && (
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {formatRelativeTime(minutesUntilNext)}
                </p>
              )}
            </>
          )}
        </div>
      </div>
      {onDelayRemaining && (
        <div className="mt-2 flex justify-end">
          <RunningLatePopoverB onApplyDelay={onDelayRemaining} />
        </div>
      )}
    </div>
  );
}
