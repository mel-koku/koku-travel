"use client";

import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/cn";
import { isToday, parseTimeToMinutes } from "@/lib/itinerary/timeUtils";

export type TodayIndicatorProps = {
  tripStartDate: string;
  dayIndex: number;
  className?: string;
};

/**
 * Format time as HH:MM
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Current time indicator for the timeline.
 * Shows a horizontal line with the current time when viewing today's itinerary.
 */
export function TodayIndicator({
  tripStartDate,
  dayIndex,
  className,
}: TodayIndicatorProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  // Only show for today
  const showIndicator = useMemo(
    () => isToday(tripStartDate, dayIndex),
    [tripStartDate, dayIndex]
  );

  if (!showIndicator) {
    return null;
  }

  return (
    <div className={cn("relative flex items-center gap-2 py-2", className)}>
      {/* Time pill */}
      <div className="flex items-center gap-1.5 rounded-full bg-brand-primary px-2.5 py-1 shadow-sm">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/75 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-foreground"></span>
        </span>
        <span className="text-xs font-semibold text-white">
          {formatTime(currentTime)}
        </span>
      </div>

      {/* Line extending right */}
      <div className="flex-1 h-0.5 bg-brand-primary" />
    </div>
  );
}

export type ActivityTimeStateProps = {
  activityArrivalTime?: string;
  activityDepartureTime?: string;
  tripStartDate: string;
  dayIndex: number;
};

/**
 * Determine if an activity is in the past, current, or future based on current time.
 */
export function useActivityTimeState({
  activityArrivalTime,
  activityDepartureTime,
  tripStartDate,
  dayIndex,
}: ActivityTimeStateProps): "past" | "current" | "future" | null {
  const [state, setState] = useState<"past" | "current" | "future" | null>(null);

  useEffect(() => {
    // Only calculate for today
    if (!isToday(tripStartDate, dayIndex)) {
      setState(null);
      return;
    }

    const calculateState = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const arrival = parseTimeToMinutes(activityArrivalTime);
      const departure = parseTimeToMinutes(activityDepartureTime);

      if (arrival === null) {
        setState(null);
        return;
      }

      if (departure !== null && currentMinutes > departure) {
        setState("past");
      } else if (currentMinutes >= arrival && (departure === null || currentMinutes <= departure)) {
        setState("current");
      } else {
        setState("future");
      }
    };

    calculateState();

    // Update every minute
    const interval = setInterval(calculateState, 60000);
    return () => clearInterval(interval);
  }, [tripStartDate, dayIndex, activityArrivalTime, activityDepartureTime]);

  return state;
}

export type TimeStateIndicatorProps = {
  state: "past" | "current" | "future" | null;
  className?: string;
};

/**
 * Visual indicator for activity time state.
 */
export function TimeStateIndicator({ state, className }: TimeStateIndicatorProps) {
  if (!state) {
    return null;
  }

  const stateStyles = {
    past: "opacity-60",
    current: "ring-2 ring-brand-primary shadow-lg",
    future: "",
  };

  return (
    <div className={cn(stateStyles[state], className)}>
      {state === "current" && (
        <div className="absolute -left-1 -top-1 z-10">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-primary opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-primary"></span>
          </span>
        </div>
      )}
    </div>
  );
}
