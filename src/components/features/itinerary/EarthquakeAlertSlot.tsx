"use client";

import { useEarthquakeAlert } from "@/hooks/useEarthquakeAlert";
import { EarthquakeBanner } from "./EarthquakeBanner";
import type { KnownRegionId } from "@/types/trip";

interface EarthquakeAlertSlotProps {
  tripId: string;
  region: KnownRegionId;
}

export function EarthquakeAlertSlot({ tripId, region }: EarthquakeAlertSlotProps) {
  const alert = useEarthquakeAlert(tripId);
  if (!alert) return null;
  return (
    <div className="mb-3">
      <EarthquakeBanner alert={alert} region={region} tripId={tripId} />
    </div>
  );
}
