import { useEffect, useMemo, useRef, useState } from "react";

import { getCoordinatesForLocationId, getCoordinatesForName } from "@/data/locationCoordinates";
import { findLocationForActivity } from "@/lib/itineraryLocations";
import type { ItineraryActivity, ItineraryDay } from "@/types/itinerary";
import type { ItineraryTravelMode } from "@/types/itinerary";
import { estimateHeuristicRoute } from "@/lib/routing/heuristic";
import { ensureLeafletResources, type LeafletMap, type LeafletMarker, type LeafletPolyline, type LeafletLayerGroup } from "./leafletUtils";
import { ItineraryMap } from "./ItineraryMap";
import { mapboxService } from "@/lib/mapbox/mapService";
import { featureFlags } from "@/lib/env/featureFlags";

const DEFAULT_CENTER = { lat: 35.0116, lng: 135.7681 }; // Kyoto station area
const DEFAULT_ZOOM = 12;
const SELECTED_MARKER_CLASS = "koku-map-marker-selected";
const ROUTE_POLYLINE_COLOR = "#6366F1";
const ROUTE_POLYLINE_HIGHLIGHT_COLOR = "#4338CA";

type MapPoint = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  timeOfDay: ItineraryActivity["timeOfDay"];
  tags?: string[];
  placeNumber: number;
};

type ItineraryMapPanelProps = {
  day: number;
  activities?: ItineraryActivity[];
  selectedActivityId?: string | null;
  onSelectActivity?: (activityId: string | null) => void;
  isPlanning?: boolean;
  startPoint?: { name: string; coordinates: { lat: number; lng: number } };
  endPoint?: { name: string; coordinates: { lat: number; lng: number } };
};

function isPlaceActivity(
  activity: ItineraryActivity
): activity is Extract<ItineraryActivity, { kind: "place" }> {
  return activity.kind === "place";
}

export const ItineraryMapPanel = ({
  day,
  activities = [],
  selectedActivityId,
  onSelectActivity,
  isPlanning = false,
  startPoint,
  endPoint,
}: ItineraryMapPanelProps) => {
  const useMapbox = featureFlags.enableMapbox && mapboxService.isEnabled();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LeafletLayerGroup | null>(null);
  const markerInstancesRef = useRef<Map<string, LeafletMarker>>(new Map());
  const routesLayerRef = useRef<LeafletLayerGroup | null>(null);
  const polylineInstancesRef = useRef<Map<string, LeafletPolyline>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const points = useMemo<MapPoint[]>(() => {
    const results: MapPoint[] = [];
    let placeCounter = 0; // Start at 0 for start point
    
    // Add start point as marker 0
    if (startPoint) {
      results.push({
        id: "start-point",
        title: startPoint.name,
        lat: startPoint.coordinates.lat,
        lng: startPoint.coordinates.lng,
        tags: [],
        timeOfDay: "morning",
        placeNumber: placeCounter++,
      });
    }
    
    // Add regular activities (starting from 1 if start point exists, otherwise from 1)
    activities.forEach((activity) => {
      if (!isPlaceActivity(activity)) {
        return;
      }
      const resolvedLocation = findLocationForActivity(activity);
      
      // Check coordinates in priority order:
      // 1. Direct coordinates on the Location object (most reliable)
      // 2. Coordinates from locationCoordinates lookup by ID
      // 3. Coordinates from locationCoordinates lookup by name
      // 4. Fallback to activity title lookup
      const coordinatesFromLocation = resolvedLocation?.coordinates ?? null;
      const coordinatesFromId =
        resolvedLocation?.id != null ? getCoordinatesForLocationId(resolvedLocation.id) : null;
      const lookupName = resolvedLocation?.name ?? activity.title;
      const coordinatesFromName = lookupName ? getCoordinatesForName(lookupName) : null;
      const coordinatesFromTitle = getCoordinatesForName(activity.title);
      
      const coordinates = coordinatesFromLocation ?? coordinatesFromId ?? coordinatesFromName ?? coordinatesFromTitle;
      if (!coordinates) {
        return;
      }

      results.push({
        id: activity.id,
        title: activity.title,
        lat: coordinates.lat,
        lng: coordinates.lng,
        tags: activity.tags,
        timeOfDay: activity.timeOfDay,
        placeNumber: placeCounter++,
      });
    });

    return results;
  }, [activities, startPoint]);

  const pointLookup = useMemo(() => {
    const map = new Map<string, MapPoint>();
    points.forEach((point) => {
      map.set(point.id, point);
    });
    return map;
  }, [points]);

  const travelSegments = useMemo(() => {
    const segments: Array<{
      id: string;
      from: Extract<ItineraryActivity, { kind: "place" }> | "start";
      to: Extract<ItineraryActivity, { kind: "place" }>;
      mode: ItineraryTravelMode;
      durationMinutes?: number;
      distanceMeters?: number;
      path?: Array<{ lat: number; lng: number }>;
      instructions?: string[];
      isFallback?: boolean;
    }> = [];

    let previousPlace: Extract<ItineraryActivity, { kind: "place" }> | "start" | null = null;
    let previousPoint: MapPoint | null = null;

    // If start point exists, add travel segment from start to first activity
    if (startPoint && activities.length > 0) {
      const firstActivity = activities.find(isPlaceActivity);
      if (firstActivity) {
        const firstPoint = pointLookup.get(firstActivity.id) ?? null;
        if (firstPoint) {
          const startPointMap: MapPoint = {
            id: "start-point",
            title: startPoint.name,
            lat: startPoint.coordinates.lat,
            lng: startPoint.coordinates.lng,
            tags: [],
            timeOfDay: "morning",
            placeNumber: 0,
          };
          
          const heuristic = estimateHeuristicRoute({
            origin: { lat: startPointMap.lat, lng: startPointMap.lng },
            destination: { lat: firstPoint.lat, lng: firstPoint.lng },
            mode: "walk",
          });

          segments.push({
            id: `start-${firstActivity.id}`,
            from: "start",
            to: firstActivity,
            mode: "walk",
            durationMinutes: Math.max(1, Math.round(heuristic.durationSeconds / 60)),
            distanceMeters: heuristic.distanceMeters,
            path: heuristic.geometry?.map((coordinate) => ({
              lat: coordinate.lat,
              lng: coordinate.lng,
            })),
            isFallback: true,
          });

          previousPlace = "start";
          previousPoint = startPointMap;
        }
      }
    }

    activities.forEach((activity) => {
      if (activity.kind !== "place") {
        return;
      }

      const currentPoint = pointLookup.get(activity.id) ?? null;
      const travel = activity.travelFromPrevious;
      const mode: ItineraryTravelMode = travel?.mode ?? "walk";

      if (previousPlace && previousPoint && currentPoint) {
        let durationMinutes = travel?.durationMinutes;
        let distanceMeters = travel?.distanceMeters;
        let path = travel?.path;
        const instructions = travel?.instructions;
        let isFallback = false;

        if (!durationMinutes || !distanceMeters || !path) {
          const heuristic = estimateHeuristicRoute({
            origin: { lat: previousPoint.lat, lng: previousPoint.lng },
            destination: { lat: currentPoint.lat, lng: currentPoint.lng },
            mode,
          });

          if (!distanceMeters) {
            distanceMeters = heuristic.distanceMeters;
          }

          if (!durationMinutes) {
            durationMinutes = Math.max(1, Math.round(heuristic.durationSeconds / 60));
          }

          if (!path && heuristic.geometry) {
            path = heuristic.geometry.map((coordinate) => ({
              lat: coordinate.lat,
              lng: coordinate.lng,
            }));
          }

          isFallback = true;
        }

        const fromId = previousPlace === "start" ? "start" : previousPlace.id;
        segments.push({
          id: `${fromId}-${activity.id}`,
          from: previousPlace === "start" ? "start" : previousPlace,
          to: activity,
          mode,
          durationMinutes,
          distanceMeters,
          path: path,
          instructions,
          isFallback,
        });
      }

      previousPlace = activity;
      previousPoint = currentPoint;
    });

    return segments;
  }, [activities, pointLookup, startPoint]);

  useEffect(() => {
    if (useMapbox) {
      return;
    }
    let cancelled = false;

    ensureLeafletResources()
      .then((Leaflet) => {
        if (cancelled || !Leaflet) {
          return;
        }

        if (!mapRef.current && containerRef.current) {
          mapRef.current = Leaflet.map(containerRef.current, {
            zoomControl: true,
            attributionControl: true,
            center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
            zoom: DEFAULT_ZOOM,
          });

          mapRef.current.on("click", () => {
            onSelectActivity?.(null);
          });

          Leaflet.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 20,
          }).addTo(mapRef.current);

          markersLayerRef.current = Leaflet.layerGroup().addTo(mapRef.current);
          routesLayerRef.current = Leaflet.layerGroup().addTo(mapRef.current);
        }

        if (!mapRef.current || !markersLayerRef.current) {
          return;
        }

        markersLayerRef.current.clearLayers();
        markerInstancesRef.current.clear();

        if (!routesLayerRef.current) {
          routesLayerRef.current = Leaflet.layerGroup().addTo(mapRef.current);
        } else {
          routesLayerRef.current.clearLayers();
        }
        polylineInstancesRef.current.clear();

        const bounds = Leaflet.latLngBounds([]);
        let hasBounds = false;

        points.forEach((point) => {
          // Create custom numbered marker icon
          // Start point (0) gets a different color
          const isStartPoint = point.placeNumber === 0;
          const backgroundColor = isStartPoint ? "#10B981" : "#4F46E5"; // Green for start, indigo for others
          
          const iconHtml = `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: 28px;
              height: 28px;
              background-color: ${backgroundColor};
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              color: white;
              font-weight: 600;
              font-size: 12px;
              line-height: 1;
            ">${point.placeNumber}</div>
          `;
          
          const customIcon = Leaflet.divIcon({
            html: iconHtml,
            className: "koku-numbered-marker",
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          
          const marker = Leaflet.marker([point.lat, point.lng], { icon: customIcon });
          const popupLabel = isStartPoint ? `<strong>Start: ${point.title}</strong>` : `<strong>${point.title}</strong>`;
          marker.bindPopup(popupLabel);
          marker.on("click", () => {
            // Only allow selecting activities, not the start point
            if (!isStartPoint) {
              onSelectActivity?.(point.id);
            }
          });
          markersLayerRef.current?.addLayer(marker);
          markerInstancesRef.current.set(point.id, marker);
          bounds.extend(marker.getLatLng());
          hasBounds = true;
        });

        travelSegments.forEach((segment) => {
          if (!routesLayerRef.current) {
            return;
          }
          const path = segment.path;
          if (!path || path.length < 2) {
            return;
          }
          const coordinates = path.map((point) => [point.lat, point.lng]) as [number, number][];
          const segmentId = segment.from === "start" ? `start-${segment.to.id}` : segment.id;
          const polyline = Leaflet.polyline(coordinates, {
            color: ROUTE_POLYLINE_COLOR,
            weight: 4,
            opacity: 0.7,
            className: "koku-map-route",
          });
          routesLayerRef.current.addLayer(polyline);
          polylineInstancesRef.current.set(segmentId, polyline);
          coordinates.forEach(([lat, lng]) => {
            bounds.extend({ lat, lng });
            hasBounds = true;
          });
        });

        if (hasBounds) {
          mapRef.current.fitBounds(bounds.pad(0.2), { maxZoom: 16 });
        } else {
          mapRef.current.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], DEFAULT_ZOOM);
        }

        setMapReady(true);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setMapError(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [points, travelSegments, onSelectActivity, useMapbox]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) {
      return;
    }
    const mapInstance = mapRef.current;
    if (!mapInstance) {
      return;
    }
    const highlightedSegmentId = selectedActivityId ?? null;
    markerInstancesRef.current.forEach((marker, id) => {
      const element = marker.getElement();
      if (!element) {
        return;
      }
      if (highlightedSegmentId && id === highlightedSegmentId) {
        element.classList.add(SELECTED_MARKER_CLASS);
        marker.openPopup();
        mapInstance.panTo(marker.getLatLng(), { animate: true, duration: 0.6 });
      } else {
        element.classList.remove(SELECTED_MARKER_CLASS);
        marker.closePopup();
      }
    });

    polylineInstancesRef.current.forEach((polyline, id) => {
      const isHighlighted = highlightedSegmentId !== null && id === highlightedSegmentId;
      polyline.setStyle?.({
        color: isHighlighted ? ROUTE_POLYLINE_HIGHLIGHT_COLOR : ROUTE_POLYLINE_COLOR,
        weight: isHighlighted ? 6 : 4,
        opacity: isHighlighted ? 0.95 : 0.7,
      });
      if (isHighlighted) {
        polyline.bringToFront?.();
      }
    });
  }, [selectedActivityId, mapReady]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <aside className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Day {day + 1} map</h2>
        <p className="text-sm text-gray-500">
          Visualize the stops planned for this day and preview travel flow.
        </p>
        {endPoint && (
          <p className="text-xs text-gray-400">Ending at {endPoint.name}</p>
        )}
      </header>
      <div className="relative flex-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
        {useMapbox ? (
          <ItineraryMap
            day={{ id: `day-${day}`, dateLabel: `Day ${day + 1}`, activities: activities ?? [] } as ItineraryDay}
            activities={activities}
            selectedActivityId={selectedActivityId}
            onActivityClick={onSelectActivity}
          />
        ) : (
          <>
            <div
              ref={containerRef}
              className="absolute inset-0"
              aria-label="Map showing planned activities"
            />
            {!mapReady && !mapError ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
                Loading map…
              </div>
            ) : null}
            {mapError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-sm text-rose-600">
                <p>We couldn&apos;t load the map right now.</p>
                <p className="mt-1 text-gray-500">Please refresh or try again later.</p>
              </div>
            ) : null}
            {mapReady && points.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-sm text-gray-500">
                <p>No mappable activities yet.</p>
                <p className="mt-1">Add places with known locations to see them here.</p>
              </div>
            ) : null}
          </>
        )}
        {isPlanning ? (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-3">
            <div className="rounded-lg bg-indigo-600/90 px-3 py-1 text-xs font-semibold text-white shadow-lg">
              Updating schedule…
            </div>
          </div>
        ) : null}
      </div>
      </aside>
      <style jsx global>{`
        .leaflet-marker-icon.${SELECTED_MARKER_CLASS},
        .leaflet-marker-shadow.${SELECTED_MARKER_CLASS} {
          filter: drop-shadow(0 2px 6px rgba(79, 70, 229, 0.45));
        }
      `}</style>
    </>
  );
};


