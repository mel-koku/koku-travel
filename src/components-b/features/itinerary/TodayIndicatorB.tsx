"use client";

import { useEffect, useState, useMemo } from "react";

export type TodayIndicatorBProps = {
  tripStartDate: string;
  dayIndex: number;
  className?: string;
};

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

function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function TodayIndicatorB({
  tripStartDate,
  dayIndex,
  className,
}: TodayIndicatorBProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const showIndicator = useMemo(
    () => isToday(tripStartDate, dayIndex),
    [tripStartDate, dayIndex],
  );

  if (!showIndicator) return null;

  return (
    <div className={`relative flex items-center gap-2 py-2 ${className ?? ""}`}>
      <div
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
        style={{
          backgroundColor: "var(--primary)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <span className="relative flex h-2 w-2">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ backgroundColor: "white" }}
          />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
        <span className="text-xs font-semibold text-white">
          {formatTime(currentTime)}
        </span>
      </div>
      <div className="h-0.5 flex-1" style={{ backgroundColor: "var(--primary)" }} />
    </div>
  );
}

export type ActivityTimeStateBProps = {
  activityArrivalTime?: string;
  activityDepartureTime?: string;
  tripStartDate: string;
  dayIndex: number;
};

export function useActivityTimeStateB({
  activityArrivalTime,
  activityDepartureTime,
  tripStartDate,
  dayIndex,
}: ActivityTimeStateBProps): "past" | "current" | "future" | null {
  const [state, setState] = useState<"past" | "current" | "future" | null>(null);

  useEffect(() => {
    if (!isToday(tripStartDate, dayIndex)) {
      setState(null);
      return;
    }

    const calculateState = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const parseTime = (timeStr?: string): number | null => {
        if (!timeStr) return null;
        const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
        if (!match) return null;
        const hours = parseInt(match[1] ?? "0", 10);
        const minutes = parseInt(match[2] ?? "0", 10);
        if (isNaN(hours) || isNaN(minutes)) return null;
        return hours * 60 + minutes;
      };

      const arrival = parseTime(activityArrivalTime);
      const departure = parseTime(activityDepartureTime);

      if (arrival === null) {
        setState(null);
        return;
      }

      if (departure !== null && currentMinutes > departure) setState("past");
      else if (currentMinutes >= arrival && (departure === null || currentMinutes <= departure))
        setState("current");
      else setState("future");
    };

    calculateState();
    const interval = setInterval(calculateState, 60000);
    return () => clearInterval(interval);
  }, [tripStartDate, dayIndex, activityArrivalTime, activityDepartureTime]);

  return state;
}
