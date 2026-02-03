/**
 * Time slot configuration and utility functions for itinerary scheduling.
 *
 * This module provides constants and functions for calculating available
 * time in each part of the day based on travel pace.
 */

import type { TripBuilderData } from "@/types/trip";

/**
 * Base time capacities for each time slot in minutes.
 * Assumes a 9am-9pm day structure.
 */
export const TIME_SLOT_CAPACITIES = {
  morning: 180, // 9am-12pm (3 hours)
  afternoon: 300, // 12pm-5pm (5 hours)
  evening: 240, // 5pm-9pm (4 hours)
} as const;

/**
 * Multipliers for how much of the time slot capacity to use based on travel pace.
 * Lower values provide more downtime between activities.
 */
export const PACE_MULTIPLIERS = {
  relaxed: 0.65, // Use 65% of capacity (more downtime)
  balanced: 0.82, // Use 82% of capacity (comfortable pace)
  fast: 0.92, // Use 92% of capacity (packed schedule)
} as const;

/**
 * Average travel time between locations based on travel pace (in minutes).
 */
export const TRAVEL_TIME_BY_PACE = {
  relaxed: 25, // More leisurely travel
  balanced: 20, // Standard travel time
  fast: 15, // Quick transitions
} as const;

export type TimeSlot = "morning" | "afternoon" | "evening";
export const TIME_OF_DAY_SEQUENCE: readonly TimeSlot[] = ["morning", "afternoon", "evening"];

/**
 * Calculate available time for a time slot based on travel pace.
 *
 * @param timeSlot - The time slot to calculate for
 * @param pace - The travel pace/style
 * @returns Available minutes in the time slot
 */
export function getAvailableTimeForSlot(
  timeSlot: TimeSlot,
  pace: TripBuilderData["style"],
): number {
  const baseCapacity = TIME_SLOT_CAPACITIES[timeSlot];
  const multiplier = pace ? PACE_MULTIPLIERS[pace] : PACE_MULTIPLIERS.balanced;
  return Math.floor(baseCapacity * multiplier);
}

/**
 * Get average travel time between locations based on pace.
 *
 * @param pace - The travel pace/style
 * @returns Average travel time in minutes
 */
export function getTravelTime(pace: TripBuilderData["style"]): number {
  return pace ? TRAVEL_TIME_BY_PACE[pace] : TRAVEL_TIME_BY_PACE.balanced;
}
