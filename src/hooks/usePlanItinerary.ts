"use client";

import { useMutation } from "@tanstack/react-query";
import type { Itinerary } from "@/types/itinerary";
import { logger } from "@/lib/logger";

/**
 * Options for itinerary planning
 */
export interface PlannerOptions {
  defaultDayStart?: string;
  defaultDayEnd?: string;
  defaultVisitMinutes?: number;
  transitionBufferMinutes?: number;
}

/**
 * Day entry points for trip planning
 */
export type DayEntryPoints = Record<
  string,
  {
    startPoint?: { coordinates: { lat: number; lng: number } };
    endPoint?: { coordinates: { lat: number; lng: number } };
  }
>;

/**
 * Request parameters for scheduling an itinerary
 */
interface ScheduleItineraryParams {
  itinerary: Itinerary;
  options?: PlannerOptions;
  dayEntryPoints?: DayEntryPoints;
}

/**
 * API response type
 */
interface ApiResponse {
  data: Itinerary;
}

/**
 * Schedules an itinerary via the API
 */
async function scheduleItinerary(
  params: ScheduleItineraryParams,
): Promise<Itinerary> {
  const response = await fetch("/api/itinerary/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const payload = await response.json();
      if (payload?.error) {
        message = payload.error as string;
      }
    } catch (jsonError) {
      logger.debug("Unable to parse error response", { error: jsonError });
    }
    throw new Error(message);
  }

  const data = (await response.json()) as ApiResponse;
  return data.data;
}

/**
 * React Query mutation hook for scheduling an itinerary.
 * This calculates travel times and operating windows for an existing itinerary.
 *
 * @returns Mutation result for scheduling the itinerary
 *
 * @example
 * ```tsx
 * const mutation = usePlanItinerary();
 *
 * const handleSchedule = () => {
 *   mutation.mutate({
 *     itinerary,
 *     dayEntryPoints,
 *   }, {
 *     onSuccess: (scheduled) => {
 *       setModel(scheduled);
 *     },
 *     onError: (error) => {
 *       console.error('Failed to schedule:', error);
 *     },
 *   });
 * };
 * ```
 */
export function usePlanItinerary() {
  return useMutation({
    mutationFn: scheduleItinerary,
    retry: 1,
  });
}

/**
 * Standalone function to schedule an itinerary.
 * Can be used outside of React components.
 *
 * @param itinerary - The itinerary to schedule
 * @param options - Optional planner options
 * @param dayEntryPoints - Optional day entry points
 * @returns Promise resolving to the scheduled itinerary
 */
export async function planItineraryClient(
  itinerary: Itinerary,
  options?: PlannerOptions,
  dayEntryPoints?: DayEntryPoints,
): Promise<Itinerary> {
  return scheduleItinerary({ itinerary, options, dayEntryPoints });
}
