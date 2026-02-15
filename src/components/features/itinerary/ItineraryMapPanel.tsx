import { useEffect, useMemo, useRef, useState } from "react";

import { getCoordinatesForLocationId, getCoordinatesForName } from "@/data/locationCoordinates";
import { useActivityLocations } from "@/hooks/useActivityLocations";
import type { ItineraryActivity, ItineraryDay } from "@/types/itinerary";
import type { ItineraryTravelMode } from "@/types/itinerary";
import { estimateHeuristicRoute } from "@/lib/routing/heuristic";
import { ensureLeafletResources, type LeafletMap, type LeafletMarker, type LeafletPolyline, type LeafletLayerGroup } from "./leafletUtils";
import { ItineraryMap } from "./ItineraryMap";
import { mapboxService } from "@/lib/mapbox/mapService";
import { featureFlags } from "@/lib/env/featureFlags";
import { mapColors } from "@/lib/mapColors";

const DEFAULT_CENTER = { lat: 35.0116, lng: 135.7681 }; // Kyoto station area
const DEFAULT_ZOOM = 12;
const SELECTED_MARKER_CLASS = "koku-map-marker-selected";
const ROUTE_POLYLINE_COLOR = mapColors.brandPrimary;
const ROUTE_POLYLINE_HIGHLIGHT_COLOR = mapColors.sage;

type MapPoint = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  timeOfDay: ItineraryActivity["timeOfDay"];
  tags?: string[];
  placeNumber: number;
  category?: string;
  mealType?: "breakfast" | "lunch" | "dinner" | "snack";
  isEntryPoint?: "start" | "end";
};

type ItineraryMapPanelProps = {
  day: number;
  activities?: ItineraryActivity[];
  selectedActivityId?: string | null;
  onSelectActivity?: (activityId: string | null) => void;
  isPlanning?: boolean;
  startPoint?: { name: string; coordinates: { lat: number; lng: number } };
  endPoint?: { name: string; coordinates: { lat: number; lng: number } };
  tripStartDate?: string;
  /** Day label like "Day 1 (Kobe)" to extract city from */
  dayLabel?: string;
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
  tripStartDate,
  dayLabel,
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

  // Filter to place activities for location fetching
  const placeActivities = useMemo(
    () => activities.filter(isPlaceActivity),
    [activities],
  );

  // Fetch location data from database
  const { locationsMap } = useActivityLocations(placeActivities);

  const points = useMemo<MapPoint[]>(() => {
    const results: MapPoint[] = [];
    let placeCounter = 1; // Start at 1 for activities (entry points use S/E labels)

    // Add start point (uses "S" label, not a number)
    if (startPoint) {
      results.push({
        id: "start-point",
        title: startPoint.name,
        lat: startPoint.coordinates.lat,
        lng: startPoint.coordinates.lng,
        tags: [],
        timeOfDay: "morning",
        placeNumber: 0, // Not displayed, uses "S" label
        isEntryPoint: "start",
      });
    }

    // Add regular activities (1-indexed to match card numbers)
    activities.forEach((activity) => {
      if (!isPlaceActivity(activity)) {
        return;
      }
      const resolvedLocation = locationsMap.get(activity.id) ?? null;

      // Check coordinates in priority order:
      // 1. Direct coordinates on the activity (most reliable - set during generation)
      // 2. Direct coordinates on the Location object
      // 3. Coordinates from locationCoordinates lookup by locationId
      // 4. Coordinates from locationCoordinates lookup by ID
      // 5. Coordinates from locationCoordinates lookup by name
      // 6. Fallback to activity title lookup
      const coordinatesFromActivity = activity.coordinates ?? null;
      const coordinatesFromLocation = resolvedLocation?.coordinates ?? null;
      const coordinatesFromLocationId =
        activity.locationId != null ? getCoordinatesForLocationId(activity.locationId) : null;
      const coordinatesFromId =
        resolvedLocation?.id != null ? getCoordinatesForLocationId(resolvedLocation.id) : null;
      const lookupName = resolvedLocation?.name ?? activity.title;
      const coordinatesFromName = lookupName ? getCoordinatesForName(lookupName) : null;
      const coordinatesFromTitle = getCoordinatesForName(activity.title);

      const coordinates = coordinatesFromActivity ?? coordinatesFromLocation ?? coordinatesFromLocationId ?? coordinatesFromId ?? coordinatesFromName ?? coordinatesFromTitle;
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
        category: resolvedLocation?.category ?? activity.tags?.[0],
        mealType: activity.mealType,
      });
    });

    // Add end point (uses "E" label, not a number)
    if (endPoint) {
      results.push({
        id: "end-point",
        title: endPoint.name,
        lat: endPoint.coordinates.lat,
        lng: endPoint.coordinates.lng,
        tags: [],
        timeOfDay: "evening",
        placeNumber: 0, // Not displayed, uses "E" label
        isEntryPoint: "end",
      });
    }

    return results;
  }, [activities, startPoint, endPoint, locationsMap]);

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
          const isStartPoint = point.isEntryPoint === "start";
          const isEndPoint = point.isEntryPoint === "end";

          // Use consistent colors from earthy palette
          let backgroundColor: string;
          if (isStartPoint || isEndPoint) {
            backgroundColor = mapColors.sage; // sage for entry points
          } else {
            backgroundColor = mapColors.brandPrimary; // brand-primary for all activities
          }

          // Show "S" for start, "E" for end, otherwise show the number
          const displayLabel = isStartPoint ? "S" : isEndPoint ? "E" : point.placeNumber;

          const iconHtml = `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: 32px;
              height: 32px;
              background-color: ${backgroundColor};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(0,0,0,0.35);
              color: white;
              font-weight: 700;
              font-size: 13px;
              line-height: 1;
              cursor: pointer;
              transition: transform 0.15s ease;
            ">${displayLabel}</div>
          `;

          const customIcon = Leaflet.divIcon({
            html: iconHtml,
            className: "koku-numbered-marker",
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const marker = Leaflet.marker([point.lat, point.lng], { icon: customIcon });
          const popupLabel = isStartPoint
            ? `<div style="text-align:center;padding:4px 8px;"><strong style="color:${mapColors.sage};">Start</strong><br/><span style="font-size:13px;">${point.title}</span></div>`
            : isEndPoint
              ? `<div style="text-align:center;padding:4px 8px;"><strong style="color:${mapColors.sage};">End</strong><br/><span style="font-size:13px;">${point.title}</span></div>`
              : `<div style="text-align:center;padding:4px 8px;"><strong style="color:${mapColors.brandPrimary};">${point.placeNumber}. ${point.title}</strong></div>`;
          marker.bindPopup(popupLabel, { closeButton: false, offset: [0, -8] });

          // Show popup on hover
          marker.on("mouseover", () => {
            marker.openPopup();
          });
          marker.on("mouseout", () => {
            // Only close if not selected
            if (selectedActivityId !== point.id) {
              marker.closePopup();
            }
          });
          marker.on("click", () => {
            // Open popup on tap for touch devices (mouseover doesn't fire)
            marker.openPopup();
            // Only allow selecting activities, not start/end points
            if (!isStartPoint && !isEndPoint) {
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
          try {
            mapRef.current.fitBounds(bounds.pad(0.2), { maxZoom: 16 });
          } catch {
            mapRef.current.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], DEFAULT_ZOOM);
          }
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
  }, [points, travelSegments, onSelectActivity, useMapbox, selectedActivityId]);

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

  // Format the day's date and extract city from label
  const dayDateLabel = useMemo(() => {
    let dateStr = `Day ${day + 1}`;

    if (tripStartDate) {
      try {
        const [year, month, dayNum] = tripStartDate.split("-").map(Number);
        if (year && month && dayNum) {
          const date = new Date(year, month - 1, dayNum);
          date.setDate(date.getDate() + day);

          const monthDayFormatter = new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric",
          });
          const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
            weekday: "short",
          });

          dateStr = `${monthDayFormatter.format(date)}, ${weekdayFormatter.format(date)}`;
        }
      } catch {
        // Keep default
      }
    }

    // Extract city from dayLabel (format: "Day X (City)")
    const cityMatch = dayLabel?.match(/\(([^)]+)\)/);
    const city = cityMatch ? cityMatch[1] : null;

    return city ? `${dateStr} · ${city}` : dateStr;
  }, [tripStartDate, day, dayLabel]);

  return (
    <>
      <aside className="flex h-full flex-col p-4">
      <header className="mb-4">
        <h2 className="font-mono text-lg font-semibold text-foreground">{dayDateLabel}</h2>
        <p className="text-sm text-stone">
          Your stops for the day, mapped out.
        </p>
        {endPoint && (
          <p className="text-xs text-stone/70">Ending at {endPoint.name}</p>
        )}
      </header>
      <div className="relative flex-1 w-full overflow-hidden rounded-xl border border-border bg-surface">
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
              <div className="absolute inset-0 flex items-center justify-center text-sm text-stone">
                Loading map…
              </div>
            ) : null}
            {mapError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-sm text-error">
                <p>We couldn&apos;t load the map right now.</p>
                <p className="mt-1 text-stone">Please refresh or try again later.</p>
              </div>
            ) : null}
            {mapReady && points.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-sm text-stone">
                <p>No places on the map yet.</p>
                <p className="mt-1">Add activities to see them here.</p>
              </div>
            ) : null}
          </>
        )}
        {isPlanning ? (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-3">
            <div className="rounded-lg bg-brand-primary/90 px-3 py-1 text-xs font-semibold text-white shadow-lg">
              Updating schedule…
            </div>
          </div>
        ) : null}
      </div>
      </aside>
      <style jsx global>{`
        .leaflet-marker-icon.${SELECTED_MARKER_CLASS},
        .leaflet-marker-shadow.${SELECTED_MARKER_CLASS} {
          filter: drop-shadow(0 2px 6px rgba(45, 122, 111, 0.6));
        }
      `}</style>
    </>
  );
};


