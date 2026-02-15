// Mapbox map implementation for activities
import { useEffect, useMemo, useRef, useState } from "react";
import type { ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import { featureFlags } from "@/lib/env/featureFlags";
import { mapboxService } from "@/lib/mapbox/mapService";
import { useActivityLocations } from "@/hooks/useActivityLocations";
import { getCoordinatesForLocationId, getCoordinatesForName } from "@/data/locationCoordinates";
import type { Coordinates } from "@/data/locationCoordinates";
import type { RoutingRequest } from "@/lib/routing/types";
import { mapColors } from "@/lib/mapColors";

const MAP_STYLE = "mapbox://styles/mel-koku/cml53wdnr000001sqd6ol4n35";
const DEFAULT_ZOOM = 12;
const DEFAULT_CENTER: [number, number] = [135.7681, 35.0116];
const ROUTE_LINE = mapColors.brandPrimary;
const ROUTE_LINE_HIGHLIGHT = mapColors.sage;
const MARKER_COLOR = mapColors.brandPrimary;
const MARKER_HIGHLIGHT_COLOR = mapColors.sage;

type MapboxModule = typeof import("mapbox-gl");

type ItineraryMapProps = {
  day: ItineraryDay;
  activities: ItineraryActivity[];
  onActivityClick?: (activityId: string) => void;
  selectedActivityId?: string | null;
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

export function ItineraryMap({
  day,
  activities,
  onActivityClick,
  selectedActivityId,
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
    if (!bounds.isEmpty()) {
      // Use fitBounds with padding option instead of bounds.pad() which doesn't exist
      map.fitBounds(bounds, { maxZoom: 16, duration: 400, padding: 50 });
    }
  }, [activityPoints, mapReady]);

  useEffect(() => {
    const mapboxModule = mapboxModuleRef.current;
    if (!mapboxModule || activityPoints.length < 2 || !mapboxEnabled) {
      setRouteSegments([]);
      return;
    }

    const controller = new AbortController();
    const loadRoutes = async () => {
      const routePromises = activityPoints.slice(1).map(async (current, i) => {
        const previous = activityPoints[i];
        if (!previous || !current) return null;
        const mode = current.activity.travelFromPrevious?.mode ?? "walk";
        const request: RoutingRequest = {
          origin: previous.coordinates,
          destination: current.coordinates,
          mode,
        };
        try {
          const result = await mapboxService.getRoute(request);
          if (controller.signal.aborted) return null;
          const path = result.geometry?.length
            ? result.geometry
            : [previous.coordinates, current.coordinates];
          return {
            id: `${previous.id}-${current.id}`,
            fromId: previous.id,
            toId: current.id,
            path,
          };
        } catch {
          if (controller.signal.aborted) return null;
          return {
            id: `${previous.id}-${current.id}`,
            fromId: previous.id,
            toId: current.id,
            path: [previous.coordinates, current.coordinates],
          };
        }
      });
      const results = await Promise.all(routePromises);
      if (!controller.signal.aborted) {
        setRouteSegments(results.filter((s): s is RouteSegment => s !== null));
      }
    };
    loadRoutes();

    return () => {
      controller.abort();
    };
  }, [activityPoints, mapboxEnabled]);

  useEffect(() => {
    const mapboxModule = mapboxModuleRef.current;
    const map = mapInstanceRef.current;
    if (!mapboxModule || !map || !mapReady) {
      return;
    }

    // Build set of current point IDs
    const currentPointIds = new Set(activityPoints.map((p) => p.id));

    // Remove markers that are no longer in activityPoints
    markersRef.current.forEach((marker, id) => {
      if (!currentPointIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add or update markers
    activityPoints.forEach((point, index) => {
      const existingMarker = markersRef.current.get(point.id);
      if (existingMarker) {
        // Update color for selection state
        const markerEl = existingMarker.getElement();
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
  }, [activityPoints, mapReady, selectedActivityId, onActivityClick]);

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
          "line-color": segment.toId === selectedActivityId ? ROUTE_LINE_HIGHLIGHT : ROUTE_LINE,
          "line-width": segment.toId === selectedActivityId ? 5 : 3,
          "line-opacity": 0.85,
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
        <p className="text-sm text-foreground-secondary text-center">No mappable activities yet.</p>
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
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-background/80 px-3 py-2 text-xs text-foreground shadow-lg backdrop-blur-sm">
        <p className="font-semibold">{day.dateLabel ?? "Planned day"}</p>
        <p className="text-foreground-secondary">{activityPoints.length} stop{activityPoints.length === 1 ? "" : "s"}</p>
      </div>
    </div>
  );
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

