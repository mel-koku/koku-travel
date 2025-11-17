// Mapbox map implementation for activities
import { useEffect, useMemo, useRef, useState } from "react";
import type { ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import { featureFlags } from "@/lib/env/featureFlags";
import { mapboxService } from "@/lib/mapbox/mapService";
import { findLocationForActivity } from "@/lib/itineraryLocations";
import { getCoordinatesForLocationId, getCoordinatesForName } from "@/data/locationCoordinates";
import type { Coordinates } from "@/data/locationCoordinates";
import type { RoutingRequest } from "@/lib/routing/types";

const MAP_STYLE = "mapbox://styles/mapbox/light-v11";
const DEFAULT_ZOOM = 12;
const DEFAULT_CENTER: [number, number] = [135.7681, 35.0116];
const ROUTE_LINE = "#6366F1";
const ROUTE_LINE_HIGHLIGHT = "#4338CA";
const MARKER_COLOR = "#4F46E5";
const MARKER_HIGHLIGHT_COLOR = "#10B981";

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

  const placeActivities = useMemo(
    () => activities.filter(
      (activity): activity is Extract<ItineraryActivity, { kind: "place" }> => activity.kind === "place",
    ),
    [activities],
  );

  const activityPoints = useMemo<ActivityPoint[]>(() => {
    const points: ActivityPoint[] = [];
    for (const activity of placeActivities) {
      const coords = resolveCoordinates(activity);
      if (!coords) continue;
      points.push({
        id: activity.id,
        title: activity.title,
        coordinates: coords,
        activity,
      });
    }
    return points;
  }, [placeActivities]);

  useEffect(() => {
    if (!mapboxEnabled) {
      setMapError("Mapbox is not configured. Set ROUTING_MAPBOX_ACCESS_TOKEN to enable the map.");
      return;
    }

    let cancelled = false;
    import("mapbox-gl")
      .then((module) => {
        const mapboxgl = ("default" in module ? module.default : module) as unknown as MapboxModule;
        (mapboxgl as any).accessToken = mapboxService.getAccessToken() ?? "";
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
      map.fitBounds((bounds as any).pad(0.3), { maxZoom: 16, duration: 400 });
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
      const segments: RouteSegment[] = [];
      for (let i = 1; i < activityPoints.length; i += 1) {
        const previous = activityPoints[i - 1];
        const current = activityPoints[i];
        if (!previous || !current) continue;
        const mode = current.activity.travelFromPrevious?.mode ?? "walk";
        const request: RoutingRequest = {
          origin: previous.coordinates,
          destination: current.coordinates,
          mode,
        };
        try {
          const result = await mapboxService.getRoute(request);
          if (controller.signal.aborted) {
            return;
          }
          const path = result.geometry?.length
            ? result.geometry
            : [previous.coordinates, current.coordinates];
          segments.push({
            id: `${previous.id}-${current.id}`,
            fromId: previous.id,
            toId: current.id,
            path,
          });
        } catch {
          if (controller.signal.aborted) {
            return;
          }
          segments.push({
            id: `${previous.id}-${current.id}`,
            fromId: previous.id,
            toId: current.id,
            path: [previous.coordinates, current.coordinates],
          });
        }
      }
      setRouteSegments(segments);
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

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    activityPoints.forEach((point) => {
      const markerEl = document.createElement("div");
      markerEl.className = "koku-mapbox-marker";
      const markerColor = point.id === selectedActivityId ? MARKER_HIGHLIGHT_COLOR : MARKER_COLOR;
      Object.assign(markerEl.style, {
        width: "26px",
        height: "26px",
        borderRadius: "50%",
        backgroundColor: markerColor,
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

  if (!mapboxEnabled || !mapboxService.isEnabled()) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-center text-sm text-gray-600">
          Enable Mapbox by setting <code className="rounded bg-gray-100 px-1 py-0.5 text-xs font-mono">ROUTING_MAPBOX_ACCESS_TOKEN</code>.
        </p>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-600 text-center">{mapError}</p>
      </div>
    );
  }

  if (activityPoints.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-600 text-center">No mappable activities yet.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full rounded-xl border border-transparent bg-gray-100">
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-gray-600">Loading map…</p>
        </div>
      )}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 h-full w-full"
        aria-label="Map showing planned activities"
      />
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-white/80 px-3 py-2 text-xs text-gray-800 shadow-lg backdrop-blur-sm">
        <p className="font-semibold">{day.dateLabel ?? "Planned day"}</p>
        <p className="text-gray-600">{activityPoints.length} stop{activityPoints.length === 1 ? "" : "s"}</p>
      </div>
    </div>
  );
}

function resolveCoordinates(activity: Extract<ItineraryActivity, { kind: "place" }>): Coordinates | null {
  const resolvedLocation = findLocationForActivity(activity);
  const fromLocation = resolvedLocation?.coordinates ?? null;
  const fallbackId = resolvedLocation?.id ? getCoordinatesForLocationId(resolvedLocation.id) : null;
  const matchByName = resolvedLocation?.name ? getCoordinatesForName(resolvedLocation.name) : null;
  const matchByTitle = getCoordinatesForName(activity.title);
  return fromLocation ?? fallbackId ?? matchByName ?? matchByTitle ?? null;
}

