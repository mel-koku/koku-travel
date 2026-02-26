// Mapbox map implementation for activities
import { useEffect, useMemo, useRef, useState } from "react";
import type { ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import { featureFlags } from "@/lib/env/featureFlags";
import { mapboxService } from "@/lib/mapbox/mapService";
import { useActivityLocations } from "@/hooks/useActivityLocations";
import { getCoordinatesForLocationId, getCoordinatesForName } from "@/data/locationCoordinates";
import type { Coordinates } from "@/data/locationCoordinates";
import type { RoutingRequest, TravelMode } from "@/lib/routing/types";
import { mapColors } from "@/lib/mapColors";

const MAP_STYLE = "mapbox://styles/mel-koku/cml53wdnr000001sqd6ol4n35";
const DEFAULT_ZOOM = 12;
const DEFAULT_CENTER: [number, number] = [135.7681, 35.0116];
const ROUTE_LINE = mapColors.brandPrimary;
const ROUTE_LINE_HIGHLIGHT = mapColors.sage;
const MARKER_COLOR = mapColors.brandPrimary;
const MARKER_HIGHLIGHT_COLOR = mapColors.sage;

type MapboxModule = typeof import("mapbox-gl");

type AccommodationPoint = {
  name: string;
  coordinates: { lat: number; lng: number };
  type?: string;
};

type ItineraryMapProps = {
  day: ItineraryDay;
  activities: ItineraryActivity[];
  onActivityClick?: (activityId: string) => void;
  selectedActivityId?: string | null;
  startPoint?: AccommodationPoint;
  endPoint?: AccommodationPoint;
};

type ActivityPoint = {
  id: string;
  title: string;
  coordinates: Coordinates;
  activity: Extract<ItineraryActivity, { kind: "place" }>;
};

type RouteSegment = {
  id: string;
  fromId: string;
  toId: string;
  path: Coordinates[];
};

const ACCOMMODATION_MARKER_COLOR = mapColors.sage;

export function ItineraryMap({
  day,
  activities,
  onActivityClick,
  selectedActivityId,
  startPoint,
  endPoint,
}: ItineraryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<InstanceType<MapboxModule["Map"]> | null>(null);
  const mapboxModuleRef = useRef<MapboxModule | null>(null);
  const markersRef = useRef<Map<string, InstanceType<MapboxModule["Marker"]>>>(new Map());
  const [mapboxModuleLoaded, setMapboxModuleLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]);
  const sourceIdsRef = useRef<string[]>([]);
  const layerIdsRef = useRef<string[]>([]);

  const mapboxEnabled = useMemo(() => featureFlags.enableMapbox && mapboxService.isEnabled(), []);
  const accessToken = useMemo(() => mapboxService.getAccessToken(), []);

  // Determine the specific error state for better user feedback
  const tokenStatus = useMemo(() => {
    if (!featureFlags.enableMapbox) {
      return { available: false, reason: "disabled" as const };
    }
    if (!accessToken) {
      return { available: false, reason: "missing" as const };
    }
    return { available: true, reason: null };
  }, [accessToken]);

  const placeActivities = useMemo(
    () => activities.filter(
      (activity): activity is Extract<ItineraryActivity, { kind: "place" }> => activity.kind === "place",
    ),
    [activities],
  );

  // Fetch location data for all activities
  const { locationsMap } = useActivityLocations(placeActivities);

  const activityPoints = useMemo<ActivityPoint[]>(() => {
    const points: ActivityPoint[] = [];
    for (const activity of placeActivities) {
      const location = locationsMap.get(activity.id) ?? null;
      const coords = resolveCoordinates(activity, location);
      if (!coords) continue;
      points.push({
        id: activity.id,
        title: activity.title,
        coordinates: coords,
        activity,
      });
    }
    return points;
  }, [placeActivities, locationsMap]);

  useEffect(() => {
    if (!mapboxEnabled) {
      // Don't set error here - we handle this case separately in the render
      return;
    }

    let cancelled = false;
    import("mapbox-gl")
      .then((module) => {
        const mapboxgl = ("default" in module ? module.default : module) as unknown as MapboxModule;
        // Set access token using type assertion for dynamic module
        (mapboxgl as MapboxModule & { accessToken: string }).accessToken = mapboxService.getAccessToken() ?? "";
        import("mapbox-gl/dist/mapbox-gl.css" as string).catch(() => {});
        if (!cancelled) {
          mapboxModuleRef.current = mapboxgl;
          setMapboxModuleLoaded(true);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMapError((error as Error).message ?? "Failed to load Mapbox GL JS");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mapboxEnabled]);

  useEffect(() => {
    const mapboxModule = mapboxModuleRef.current;
    if (!mapboxModule || !mapboxEnabled || !mapContainerRef.current) {
      return;
    }

    const map = new mapboxModule.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });
    map.addControl(new mapboxModule.NavigationControl(), "top-right");
    map.on("load", () => {
      setMapReady(true);
    });
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      setMapReady(false);
    };
  }, [mapboxModuleLoaded, mapboxEnabled]);

  useEffect(() => {
    const mapboxModule = mapboxModuleRef.current;
    const map = mapInstanceRef.current;
    if (!map || !mapboxModule || activityPoints.length === 0) {
      return;
    }
    const bounds = new mapboxModule.LngLatBounds();
    activityPoints.forEach((point) => bounds.extend([point.coordinates.lng, point.coordinates.lat]));
    // Include accommodation points in bounds
    if (startPoint) bounds.extend([startPoint.coordinates.lng, startPoint.coordinates.lat]);
    if (endPoint) bounds.extend([endPoint.coordinates.lng, endPoint.coordinates.lat]);
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { maxZoom: 16, duration: 400, padding: 50 });
    }
  }, [activityPoints, startPoint, endPoint, mapReady]);

  useEffect(() => {
    if (!mapboxEnabled) {
      setRouteSegments([]);
      return;
    }
    // Need at least 2 activity points for inter-activity routes,
    // OR accommodation points with at least 1 activity
    if (activityPoints.length < 2 && !(startPoint || endPoint) ) {
      setRouteSegments([]);
      return;
    }
    if (activityPoints.length === 0) {
      setRouteSegments([]);
      return;
    }

    const controller = new AbortController();
    const loadRoutes = async () => {
      const allPromises: Promise<RouteSegment | null>[] = [];

      // Route from start accommodation → first activity
      if (startPoint && activityPoints.length > 0) {
        const first = activityPoints[0]!;
        allPromises.push(
          fetchRoute(
            "accom-start",
            first.id,
            startPoint.coordinates,
            first.coordinates,
            "walk",
            controller.signal,
          ),
        );
      }

      // Inter-activity routes
      for (let i = 1; i < activityPoints.length; i++) {
        const previous = activityPoints[i - 1]!;
        const current = activityPoints[i]!;
        const mode = current.activity.travelFromPrevious?.mode ?? "walk";
        allPromises.push(
          fetchRoute(previous.id, current.id, previous.coordinates, current.coordinates, mode, controller.signal),
        );
      }

      // Route from last activity → end accommodation
      if (endPoint && activityPoints.length > 0) {
        const last = activityPoints[activityPoints.length - 1]!;
        allPromises.push(
          fetchRoute(
            last.id,
            "accom-end",
            last.coordinates,
            endPoint.coordinates,
            "walk",
            controller.signal,
          ),
        );
      }

      const results = await Promise.all(allPromises);
      if (!controller.signal.aborted) {
        setRouteSegments(results.filter((s): s is RouteSegment => s !== null));
      }
    };
    loadRoutes();

    return () => {
      controller.abort();
    };
  }, [activityPoints, startPoint, endPoint, mapboxEnabled]);

  useEffect(() => {
    const mapboxModule = mapboxModuleRef.current;
    const map = mapInstanceRef.current;
    if (!mapboxModule || !map || !mapReady) {
      return;
    }

    // Build set of all current marker IDs (activities + accommodations)
    const currentPointIds = new Set(activityPoints.map((p) => p.id));
    if (startPoint) currentPointIds.add("accom-start");
    if (endPoint) currentPointIds.add("accom-end");

    // Remove markers that are no longer needed
    markersRef.current.forEach((marker, id) => {
      if (!currentPointIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Accommodation markers (sage-colored, hotel icon)
    const accomEntries: Array<{ id: string; point: AccommodationPoint; label: string }> = [];
    if (startPoint) accomEntries.push({ id: "accom-start", point: startPoint, label: "Start" });
    if (endPoint && !(startPoint && endPoint.coordinates.lat === startPoint.coordinates.lat && endPoint.coordinates.lng === startPoint.coordinates.lng)) {
      accomEntries.push({ id: "accom-end", point: endPoint, label: "End" });
    }

    for (const { id, point, label } of accomEntries) {
      const existing = markersRef.current.get(id);
      if (existing) {
        existing.setLngLat([point.coordinates.lng, point.coordinates.lat]);
        continue;
      }

      const el = document.createElement("div");
      el.className = "koku-mapbox-marker-accom";
      Object.assign(el.style, {
        width: "30px",
        height: "30px",
        borderRadius: "50%",
        backgroundColor: ACCOMMODATION_MARKER_COLOR,
        border: "2.5px solid white",
        boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      });
      // Hotel SVG icon
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 14v.01M12 14v.01M16 14v.01M8 18v.01M12 18v.01M16 18v.01"/></svg>`;
      el.title = `${label}: ${point.name}`;

      const marker = new mapboxModule.Marker({ element: el })
        .setLngLat([point.coordinates.lng, point.coordinates.lat])
        .addTo(map);
      markersRef.current.set(id, marker);
    }

    // Add or update activity markers
    activityPoints.forEach((point, index) => {
      const existingMarker = markersRef.current.get(point.id);
      if (existingMarker) {
        // Update number and color (order may have changed after drag reorder)
        const markerEl = existingMarker.getElement();
        markerEl.textContent = String(index + 1);
        markerEl.style.backgroundColor = point.id === selectedActivityId ? MARKER_HIGHLIGHT_COLOR : MARKER_COLOR;
        return;
      }

      // Create new marker
      const markerEl = document.createElement("div");
      markerEl.className = "koku-mapbox-marker";
      Object.assign(markerEl.style, {
        width: "26px",
        height: "26px",
        borderRadius: "50%",
        backgroundColor: point.id === selectedActivityId ? MARKER_HIGHLIGHT_COLOR : MARKER_COLOR,
        border: "2px solid white",
        boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        fontWeight: "600",
        color: "#fff",
      });
      markerEl.setAttribute("data-activity-id", point.id);
      markerEl.textContent = String(index + 1);

      const marker = new mapboxModule.Marker({ element: markerEl })
        .setLngLat([point.coordinates.lng, point.coordinates.lat])
        .addTo(map);
      marker.getElement().addEventListener("click", () => {
        onActivityClick?.(point.id);
      });
      markersRef.current.set(point.id, marker);
    });
  }, [activityPoints, startPoint, endPoint, mapReady, selectedActivityId, onActivityClick]);

  useEffect(() => {
    const mapboxModule = mapboxModuleRef.current;
    const map = mapInstanceRef.current;
    if (!mapboxModule || !map || !mapReady) {
      return;
    }

    layerIdsRef.current.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    });
    sourceIdsRef.current.forEach((sourceId) => {
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    });
    layerIdsRef.current = [];
    sourceIdsRef.current = [];

    routeSegments.forEach((segment) => {
      if (segment.path.length < 2) {
        return;
      }
      const sourceId = `itinerary-route-source-${segment.id}`;
      const layerId = `itinerary-route-layer-${segment.id}`;
      const coordinates = segment.path.map((coord) => [coord.lng, coord.lat]) as [number, number][];
      const isAccomSegment = segment.fromId === "accom-start" || segment.toId === "accom-end";

      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates,
          },
        },
      });
      sourceIdsRef.current.push(sourceId);

      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": isAccomSegment ? ACCOMMODATION_MARKER_COLOR : (segment.toId === selectedActivityId ? ROUTE_LINE_HIGHLIGHT : ROUTE_LINE),
          "line-width": segment.toId === selectedActivityId ? 5 : 3,
          "line-opacity": isAccomSegment ? 0.6 : 0.85,
          "line-dasharray": isAccomSegment ? [2, 2] : [1, 0],
        },
      });
      layerIdsRef.current.push(layerId);
    });
  }, [routeSegments, mapReady, selectedActivityId]);

  if (!tokenStatus.available) {
    const errorMessage = tokenStatus.reason === "disabled"
      ? "Mapbox has been disabled via ENABLE_MAPBOX=false."
      : (
        <>
          Map requires a Mapbox token. Set{" "}
          <code className="rounded bg-surface px-1 py-0.5 text-xs font-mono">
            NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
          </code>{" "}
          in your environment variables.
        </>
      );

    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl border border-border bg-surface p-4">
        <p className="text-center text-sm text-foreground-secondary">
          {errorMessage}
        </p>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl border border-border bg-surface p-4">
        <p className="text-sm text-foreground-secondary text-center">{mapError}</p>
      </div>
    );
  }

  if (activityPoints.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl border border-border bg-surface p-4">
        <p className="text-sm text-foreground-secondary text-center">No mappable activities.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full rounded-xl border border-transparent bg-surface">
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-foreground-secondary">Loading map…</p>
        </div>
      )}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 h-full w-full"
        aria-label="Map showing planned activities"
      />
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl bg-background/80 px-3 py-2 text-xs text-foreground shadow-lg backdrop-blur-sm">
        <p className="font-semibold">{day.dateLabel ?? "Planned day"}</p>
        <p className="text-foreground-secondary">{activityPoints.length} stop{activityPoints.length === 1 ? "" : "s"}</p>
      </div>
    </div>
  );
}

async function fetchRoute(
  fromId: string,
  toId: string,
  origin: Coordinates,
  destination: Coordinates,
  mode: TravelMode,
  signal: AbortSignal,
): Promise<RouteSegment | null> {
  const request: RoutingRequest = { origin, destination, mode };
  try {
    const result = await mapboxService.getRoute(request);
    if (signal.aborted) return null;
    const path = result.geometry?.length
      ? result.geometry
      : [origin, destination];
    return { id: `${fromId}-${toId}`, fromId, toId, path };
  } catch {
    if (signal.aborted) return null;
    return { id: `${fromId}-${toId}`, fromId, toId, path: [origin, destination] };
  }
}

function resolveCoordinates(
  activity: Extract<ItineraryActivity, { kind: "place" }>,
  resolvedLocation: Location | null,
): Coordinates | null {
  // First check if activity has embedded coordinates (entry points, external places)
  if (activity.coordinates) {
    return activity.coordinates;
  }
  const fromLocation = resolvedLocation?.coordinates ?? null;
  const fallbackId = resolvedLocation?.id ? getCoordinatesForLocationId(resolvedLocation.id) : null;
  const matchByName = resolvedLocation?.name ? getCoordinatesForName(resolvedLocation.name) : null;
  const matchByTitle = getCoordinatesForName(activity.title);
  return fromLocation ?? fallbackId ?? matchByName ?? matchByTitle ?? null;
}

