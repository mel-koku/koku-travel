"use client";

import { useEffect, useRef, useState } from "react";
import type { ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import { env } from "@/lib/env";
import { mapboxService } from "@/lib/mapbox/mapService";

type ItineraryMapProps = {
  day: ItineraryDay;
  activities: ItineraryActivity[];
  onActivityClick?: (activityId: string) => void;
  selectedActivityId?: string | null;
};

/**
 * ItineraryMap component for displaying itinerary activities on a map
 * 
 * Note: This is a placeholder component. Full Mapbox GL JS integration
 * requires installing @mapbox/mapbox-gl-js and @mapbox/mapbox-gl-directions.
 * 
 * For now, this component shows a message when Mapbox is not configured,
 * or can be enhanced to use Mapbox GL JS when the library is installed.
 */
export function ItineraryMap({
  day,
  activities,
  onActivityClick,
  selectedActivityId,
}: ItineraryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isMapboxEnabled, setIsMapboxEnabled] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Mapbox is enabled
    const enabled = mapboxService.isEnabled();
    setIsMapboxEnabled(enabled);

    if (!enabled) {
      setMapError("Mapbox is not configured. Set ROUTING_MAPBOX_ACCESS_TOKEN to enable maps.");
      return;
    }

    // TODO: Initialize Mapbox GL JS map here
    // This requires installing @mapbox/mapbox-gl-js
    // Example:
    // import mapboxgl from 'mapbox-gl';
    // import 'mapbox-gl/dist/mapbox-gl.css';
    // 
    // const map = new mapboxgl.Map({
    //   container: mapContainerRef.current,
    //   style: 'mapbox://styles/mapbox/streets-v12',
    //   accessToken: mapboxService.getAccessToken(),
    //   center: [longitude, latitude],
    //   zoom: 13
    // });
    //
    // Add markers for each activity
    // Add route lines between activities
    // Handle click events to call onActivityClick

    setMapError("Mapbox GL JS integration pending. Install @mapbox/mapbox-gl-js to enable.");
  }, [day, activities]);

  // Filter to only place activities with coordinates
  const placeActivities = activities.filter(
    (activity): activity is Extract<ItineraryActivity, { kind: "place" }> =>
      activity.kind === "place" && Boolean(activity.locationId),
  );

  if (!isMapboxEnabled) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <div className="text-center">
          <p className="text-sm text-gray-600">Map view unavailable</p>
          <p className="mt-1 text-xs text-gray-500">
            Configure Mapbox to see your itinerary on a map
          </p>
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <div className="text-center">
          <p className="text-sm text-gray-600">{mapError}</p>
        </div>
      </div>
    );
  }

  if (placeActivities.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <div className="text-center">
          <p className="text-sm text-gray-600">No activities with locations to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-lg border border-gray-200">
      <div ref={mapContainerRef} className="h-full w-full" />
      <div className="absolute bottom-4 left-4 rounded-lg bg-white px-3 py-2 shadow-lg">
        <p className="text-xs font-medium text-gray-900">{day.dateLabel ?? `Day ${day.id}`}</p>
        <p className="text-xs text-gray-600">{placeActivities.length} locations</p>
      </div>
    </div>
  );
}

