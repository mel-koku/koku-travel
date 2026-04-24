"use client";

import { useEffect, useState } from "react";

/**
 * Returns today's date in Asia/Tokyo as a YYYY-MM-DD string.
 *
 * Uses `Intl.DateTimeFormat('en-CA')` which formats as YYYY-MM-DD natively.
 * Avoids `toLocaleString` because of known cross-browser inconsistencies on
 * the timezone string.
 *
 * Pure, no side effects, safe to call server-side.
 */
export function tokyoDateString(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

export type FocusDayResult = { index: number; isDayOfMode: boolean };

/**
 * Pure. Given a list of trip days and today's YYYY-MM-DD, returns:
 *   - the focus day index (today if matches; else nearest upcoming; else 0)
 *   - whether day-of mode should be active (today matches a day)
 */
export function resolveFocusDay(
  days: Array<{ date: string }>,
  todayIso: string,
): FocusDayResult {
  if (days.length === 0) return { index: 0, isDayOfMode: false };

  const todayIdx = days.findIndex((d) => d.date === todayIso);
  if (todayIdx >= 0) return { index: todayIdx, isDayOfMode: true };

  const futureIdx = days.findIndex((d) => d.date > todayIso);
  if (futureIdx >= 0) return { index: futureIdx, isDayOfMode: false };

  return { index: 0, isDayOfMode: false };
}

/**
 * Client hook. On server render, always returns {index: 0, isDayOfMode: false}.
 * On hydration, re-resolves using Asia/Tokyo today.
 */
export function useFocusDay(
  days: Array<{ date: string }>,
): FocusDayResult {
  const [result, setResult] = useState<FocusDayResult>({
    index: 0,
    isDayOfMode: false,
  });
  useEffect(() => {
    setResult(resolveFocusDay(days, tokyoDateString()));
  }, [days]);
  return result;
}
