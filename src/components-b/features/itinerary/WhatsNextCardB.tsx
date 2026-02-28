"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Target, Moon } from "lucide-react";
import type { ItineraryActivity, ItineraryDay } from "@/types/itinerary";
import { RunningLatePopoverB } from "./RunningLatePopoverB";
import {
  isToday,
  parseTimeToMinutes,
  formatRelativeTime,
  getCurrentMinutes,
} from "@/lib/itinerary/timeUtils";

export type WhatsNextCardBProps = {
  day: ItineraryDay;
  tripStartDate: string;
  dayIndex: number;
  className?: string;
  onActivityClick?: (activityId: string) => void;
  onDelayRemaining?: (delayMinutes: number) => void;
  onCheckIn?: (activityId: string) => void;
  checkedInIds?: Set<string>;
};

function getActivityStatus(
  activities: ItineraryActivity[],
  currentTimeMinutes: number,
  checkedInIds?: Set<string>,
) {
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

function buildMapsLink(title: string, coords?: { lat: number; lng: number }): string | null {
  if (!coords) return null;
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isIOS) return `https://maps.apple.com/?q=${encodeURIComponent(title)}&ll=${coords.lat},${coords.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
}

export function WhatsNextCardB({
  day,
  tripStartDate,
  dayIndex,
  className,
  onActivityClick,
  onDelayRemaining,
  onCheckIn,
  checkedInIds,
}: WhatsNextCardBProps) {
  // Live-updating current time (60s interval)
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(getCurrentMinutes);
  const [todayDate, setTodayDate] = useState(() => new Date().toDateString());

  // Only show for today — depends on todayDate so it recalculates after midnight
  const showCard = useMemo(
    () => isToday(tripStartDate, dayIndex),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tripStartDate, dayIndex, todayDate],
  );

  // Fast timer (60s) when showing, slow timer (5min) when not — detects midnight rollover
  useEffect(() => {
    const intervalMs = showCard ? 60_000 : 5 * 60_000;
    const interval = setInterval(() => {
      if (showCard) setCurrentTimeMinutes(getCurrentMinutes());
      const newDate = new Date().toDateString();
      if (newDate !== todayDate) setTodayDate(newDate);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [showCard, todayDate]);

  const { current, next, minutesUntilNext } = useMemo(
    () => getActivityStatus(day.activities, currentTimeMinutes, checkedInIds),
    [day.activities, currentTimeMinutes, checkedInIds],
  );

  const handleCheckIn = useCallback(
    (activityId: string) => onCheckIn?.(activityId),
    [onCheckIn],
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
    const mapsLink = buildMapsLink(current.title, current.coordinates);
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
              <p className="text-xs font-medium uppercase tracking-[0.15em]" style={{ color: "var(--success)" }}>
                You&apos;re at
              </p>
              <p className="truncate text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                {current.title}
              </p>
            </div>
          </div>
          {current.schedule?.departureTime && (
            <div className="shrink-0 text-right">
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Until</p>
              <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{current.schedule.departureTime}</p>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 pt-2" style={{ borderTop: "1px solid color-mix(in srgb, var(--success) 20%, transparent)" }}>
          {mapsLink && (
            <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="text-xs font-medium hover:underline" style={{ color: "var(--success)" }}>
              Open in Maps
            </a>
          )}
          {onCheckIn && (
            <button type="button" onClick={() => handleCheckIn(current.id)} className="ml-auto text-xs font-medium hover:underline" style={{ color: "var(--success)" }}>
              Mark as visited
            </button>
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
              className="truncate text-sm font-semibold text-[var(--foreground)] transition-colors hover:text-[var(--primary)]"
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
      {/* Actions: Maps + check-in + running late */}
      <div className="mt-3 flex items-center gap-2 pt-2" style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" }}>
        {next && (() => {
          const link = buildMapsLink(next.title, next.coordinates);
          return link ? (
            <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs font-medium hover:underline" style={{ color: "var(--primary)" }}>
              Open in Maps
            </a>
          ) : null;
        })()}
        {current && onCheckIn && (
          <button type="button" onClick={() => handleCheckIn(current.id)} className="text-xs font-medium hover:underline" style={{ color: "var(--success)" }}>
            Mark as visited
          </button>
        )}
        {onDelayRemaining && (
          <div className="ml-auto">
            <RunningLatePopoverB onApplyDelay={onDelayRemaining} />
          </div>
        )}
      </div>
    </div>
  );
}
