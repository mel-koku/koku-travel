"use client";

import { useCallback, useState } from "react";

function getStorageKey(tripId: string, dayId: string): string {
  return `koku:checkins:${tripId}:${dayId}`;
}

function loadCheckins(tripId: string, dayId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(getStorageKey(tripId, dayId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveCheckins(tripId: string, dayId: string, ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStorageKey(tripId, dayId), JSON.stringify([...ids]));
  } catch {
    // localStorage full — ignore
  }
}

/**
 * localStorage-backed Set of checked-in activity IDs for a specific trip day.
 * Ephemeral day-of state — does not sync to Supabase.
 */
export function useActivityCheckins(tripId: string | undefined, dayId: string | undefined) {
  const [checkedIn, setCheckedIn] = useState<Set<string>>(() => {
    if (!tripId || !dayId) return new Set();
    return loadCheckins(tripId, dayId);
  });

  const checkIn = useCallback(
    (activityId: string) => {
      if (!tripId || !dayId) return;
      setCheckedIn((prev) => {
        const next = new Set(prev);
        next.add(activityId);
        saveCheckins(tripId, dayId, next);
        return next;
      });
    },
    [tripId, dayId],
  );

  const isCheckedIn = useCallback(
    (activityId: string) => checkedIn.has(activityId),
    [checkedIn],
  );

  return { checkedIn, checkIn, isCheckedIn };
}
