"use client";

import { useCallback, useEffect, useState } from "react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { JapanMapPicker } from "./JapanMapPicker";
import type { EntryPoint } from "@/types/trip";
import type { Airport } from "@/app/api/airports/route";
import { logger } from "@/lib/logger";

/**
 * Entry point selection sub-step.
 * Uses visual Japan map picker with airport markers.
 * This step is optional - user can skip without selecting an airport.
 */
export function EntryPointStep() {
  const { data, setData } = useTripBuilder();
  const [airports, setAirports] = useState<Airport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch airports on mount
  useEffect(() => {
    async function fetchAirports() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/airports");
        if (!response.ok) {
          throw new Error("Failed to fetch airports");
        }
        const result = await response.json();
        setAirports(result.data || []);
      } catch (error) {
        logger.error(
          "Error fetching airports",
          error instanceof Error ? error : new Error(String(error))
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchAirports();
  }, []);

  const handleEntryPointChange = useCallback(
    (entryPoint: EntryPoint | undefined) => {
      setData((prev) => ({
        ...prev,
        entryPoint,
      }));
    },
    [setData]
  );

  return (
    <JapanMapPicker
      value={data.entryPoint}
      onChange={handleEntryPointChange}
      airports={airports}
      isLoading={isLoading}
    />
  );
}
