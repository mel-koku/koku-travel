"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";

import { getCoordinatesForLocationId, getCoordinatesForName } from "@/data/locationCoordinates";
import { findLocationForActivity } from "@/lib/itineraryLocations";
import type { ItineraryActivity } from "@/types/itinerary";
import type { ItineraryTravelMode } from "@/types/itinerary";
import { estimateHeuristicRoute } from "@/lib/routing/heuristic";

const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

const DEFAULT_CENTER = { lat: 35.0116, lng: 135.7681 }; // Kyoto station area
const DEFAULT_ZOOM = 12;
const SELECTED_MARKER_CLASS = "koku-map-marker-selected";
const ROUTE_POLYLINE_COLOR = "#6366F1";
const ROUTE_POLYLINE_HIGHLIGHT_COLOR = "#4338CA";

const TIME_OF_DAY_LABEL: Record<ItineraryActivity["timeOfDay"], string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

type MapPoint = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  timeOfDay: ItineraryActivity["timeOfDay"];
  tags?: string[];
};

type ItineraryMapPanelProps = {
  day: number;
  activities?: ItineraryActivity[];
  selectedActivityId?: string | null;
  onSelectActivity?: (activityId: string | null) => void;
  isPlanning?: boolean;
};

function isPlaceActivity(
  activity: ItineraryActivity
): activity is Extract<ItineraryActivity, { kind: "place" }> {
  return activity.kind === "place";
}

type LeafletLatLng = {
  lat: number;
  lng: number;
};

type LeafletLatLngBounds = {
  extend(latlng: LeafletLatLng): void;
  pad(factor: number): LeafletLatLngBounds;
};

type LeafletMarker = {
  bindPopup(html: string): LeafletMarker;
  on(event: string, handler: () => void): void;
  getLatLng(): LeafletLatLng;
  getElement(): HTMLElement | null;
  openPopup(): void;
  closePopup(): void;
};

type LeafletPolyline = {
  addTo(map: LeafletMap): LeafletPolyline;
  setStyle(options: {
    color?: string;
    weight?: number;
    opacity?: number;
    dashArray?: string;
  }): void;
  bringToFront?: () => void;
  getElement?: () => HTMLElement | null;
};

type LeafletLayer = LeafletMarker | LeafletPolyline;

type LeafletLayerGroup = {
  addTo(map: LeafletMap): LeafletLayerGroup;
  addLayer(layer: LeafletLayer): void;
  clearLayers(): void;
};

type LeafletTileLayer = {
  addTo(map: LeafletMap): LeafletTileLayer;
};

type LeafletMap = {
  on(event: string, handler: () => void): void;
  setView(center: [number, number], zoom: number): void;
  fitBounds(bounds: LeafletLatLngBounds, options?: { maxZoom?: number }): void;
  panTo(latlng: LeafletLatLng, options?: { animate?: boolean; duration?: number }): void;
  remove(): void;
};

type LeafletModule = {
  map(container: HTMLElement, options: {
    zoomControl: boolean;
    attributionControl: boolean;
    center: [number, number];
    zoom: number;
  }): LeafletMap;
  layerGroup(): LeafletLayerGroup;
  tileLayer(url: string, options: {
    attribution: string;
    subdomains: string;
    maxZoom: number;
  }): LeafletTileLayer;
  marker(position: [number, number]): LeafletMarker;
  polyline(latlngs: [number, number][], options: {
    color?: string;
    weight?: number;
    opacity?: number;
    dashArray?: string;
    className?: string;
  }): LeafletPolyline;
  latLngBounds(initial: unknown[]): LeafletLatLngBounds;
};

declare global {
  interface Window {
    L?: LeafletModule;
    __leafletLoadingPromise?: Promise<LeafletModule | null>;
  }
}

function ensureLeafletResources(): Promise<LeafletModule | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (window.L) {
    return Promise.resolve(window.L);
  }

  if (window.__leafletLoadingPromise) {
    return window.__leafletLoadingPromise;
  }

  if (!document.querySelector(`link[data-origin="leaflet"]`)) {
    const link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", LEAFLET_CSS_URL);
    link.setAttribute("data-origin", "leaflet");
    document.head.appendChild(link);
  }

  window.__leafletLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.addEventListener("load", () => {
      resolve(window.L ?? null);
    });
    script.addEventListener("error", (event) => {
      console.error("Failed to load Leaflet script", event);
      reject(new Error("Failed to load Leaflet script."));
    });
    document.body.appendChild(script);
  });

  return window.__leafletLoadingPromise;
}

export const ItineraryMapPanel = ({
  day,
  activities = [],
  selectedActivityId,
  onSelectActivity,
  isPlanning = false,
}: ItineraryMapPanelProps) => {
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
    activities.forEach((activity) => {
      if (!isPlaceActivity(activity)) {
        return;
      }
      const resolvedLocation = findLocationForActivity(activity);
      const coordinatesFromId =
        resolvedLocation?.id != null ? getCoordinatesForLocationId(resolvedLocation.id) : null;
      const lookupName = resolvedLocation?.name ?? activity.title;
      const coordinatesFromName = lookupName ? getCoordinatesForName(lookupName) : null;
      const coordinates = coordinatesFromId ?? coordinatesFromName ?? getCoordinatesForName(activity.title);
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
      });
    });

    return results;
  }, [activities]);

  const pointLookup = useMemo(() => {
    const map = new Map<string, MapPoint>();
    points.forEach((point) => {
      map.set(point.id, point);
    });
    return map;
  }, [points]);

  const placeIndexLookup = useMemo(() => {
    const map = new Map<string, number>();
    let counter = 1;
    activities.forEach((activity) => {
      if (isPlaceActivity(activity)) {
        map.set(activity.id, counter);
        counter += 1;
      }
    });
    return map;
  }, [activities]);

  const placeActivities = useMemo(() => activities.filter(isPlaceActivity), [activities]);

  const travelSegments = useMemo(() => {
    const segments: Array<{
      id: string;
      from: Extract<ItineraryActivity, { kind: "place" }>;
      to: Extract<ItineraryActivity, { kind: "place" }>;
      mode: ItineraryTravelMode;
      durationMinutes?: number;
      distanceMeters?: number;
      path?: Array<{ lat: number; lng: number }>;
      instructions?: string[];
      isFallback?: boolean;
    }> = [];

    let previousPlace: Extract<ItineraryActivity, { kind: "place" }> | null = null;
    let previousPoint: MapPoint | null = null;

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

        segments.push({
          id: `${previousPlace.id}-${activity.id}`,
          from: previousPlace,
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
  }, [activities, pointLookup]);

  const formatDuration = useCallback((minutes?: number) => {
    if (!minutes || minutes <= 0) {
      return null;
    }
    if (minutes >= 120) {
      const hours = Math.floor(minutes / 60);
      const remainder = minutes % 60;
      return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
    }
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainder = minutes % 60;
      return `${hours}h ${remainder}m`;
    }
    return `${minutes} min`;
  }, []);

  const formatDistance = useCallback((meters?: number) => {
    if (!meters || meters <= 0) {
      return null;
    }
    if (meters >= 1000) {
      const kilometers = meters / 1000;
      return kilometers >= 10 ? `${Math.round(kilometers)} km` : `${(Math.round(kilometers * 10) / 10).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  }, []);

  const travelSegmentLookup = useMemo(() => {
    const map = new Map<string, (typeof travelSegments)[number]>();
    travelSegments.forEach((segment) => {
      map.set(segment.to.id, segment);
    });
    return map;
  }, [travelSegments]);

  const formatModeLabel = useCallback((mode: ItineraryTravelMode) => {
    switch (mode) {
      case "walk":
        return "Walk";
      case "transit":
        return "Public transit";
      case "train":
        return "Train";
      case "subway":
        return "Subway";
      case "bus":
        return "Bus";
      case "tram":
        return "Tram";
      case "ferry":
        return "Ferry";
      case "bicycle":
        return "Bike";
      case "car":
        return "Car";
      case "taxi":
        return "Taxi";
      case "rideshare":
        return "Rideshare";
      default:
        return mode;
    }
  }, []);

  useEffect(() => {
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
          const marker = Leaflet.marker([point.lat, point.lng]);
          marker.bindPopup(`<strong>${point.title}</strong>`);
          marker.on("click", () => {
            onSelectActivity?.(point.id);
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
          const polyline = Leaflet.polyline(coordinates, {
            color: ROUTE_POLYLINE_COLOR,
            weight: 4,
            opacity: 0.7,
            className: "koku-map-route",
          });
          routesLayerRef.current.addLayer(polyline);
          polylineInstancesRef.current.set(segment.to.id, polyline);
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
  }, [points, travelSegments, onSelectActivity]);

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
      </header>
      <div className="relative flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
        <div
          ref={containerRef}
          className="absolute inset-0"
          style={{
            minHeight: "320px",
          }}
          aria-label="Map showing planned activities"
        />
        {!mapReady && !mapError ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
            Loading map…
          </div>
        ) : null}
        {isPlanning ? (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-3">
            <div className="rounded-lg bg-indigo-600/90 px-3 py-1 text-xs font-semibold text-white shadow-lg">
              Updating schedule…
            </div>
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
      </div>
        <div className="mt-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Route overview
          </h3>
          {placeActivities.length > 0 ? (
            <ol className="mt-2 space-y-3">
              {placeActivities.map((activity, index) => {
                const placeNumber = placeIndexLookup.get(activity.id) ?? index + 1;
                const point = pointLookup.get(activity.id);
                const travelSegment = travelSegmentLookup.get(activity.id);
                const previousActivity = placeActivities[index - 1];
                const travelDurationLabel = formatDuration(travelSegment?.durationMinutes);
                const travelDistanceLabel = formatDistance(travelSegment?.distanceMeters);
                const previousNumber =
                  previousActivity ? placeIndexLookup.get(previousActivity.id) ?? index : null;
                return (
                  <li
                    key={activity.id}
                    className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-sm text-indigo-900"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                        {placeNumber}
                      </div>
                      <div className="flex-1 space-y-1 text-indigo-900">
                        <p className="font-semibold">{activity.title}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-indigo-700">
                          <span>{TIME_OF_DAY_LABEL[activity.timeOfDay]}</span>
                          {activity.schedule?.arrivalTime ? (
                            <span>
                              Arrive {activity.schedule.arrivalTime}
                              {activity.schedule?.departureTime
                                ? ` · Depart ${activity.schedule.departureTime}`
                                : ""}
                            </span>
                          ) : null}
                          {activity.durationMin ? <span>{activity.durationMin} min planned</span> : null}
                        </div>
                        {activity.notes ? (
                          <p className="text-xs text-indigo-600 line-clamp-2">{activity.notes}</p>
                        ) : null}
                        {activity.tags && activity.tags.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                            {activity.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-white/60 px-2 py-0.5 font-semibold text-indigo-700"
                              >
                                {tag}
                              </span>
                            ))}
                            {activity.tags.length > 3 ? (
                              <span className="rounded-full bg-white/60 px-2 py-0.5 font-medium text-indigo-700">
                                +{activity.tags.length - 3} more
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        {index === 0 ? (
                          <p className="text-xs font-medium text-indigo-700">Day kickoff</p>
                        ) : null}
                      </div>
                      <div className="mt-0.5 shrink-0">
                        {point ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                            On map
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                            Location unknown
                          </span>
                        )}
                      </div>
                    </div>
                    {index > 0 ? (
                      <div className="mt-3 rounded-lg border border-indigo-100 bg-white/70 p-3 text-xs text-indigo-800">
                        <p className="font-semibold">
                          Travel from Stop {previousNumber} · {previousActivity?.title ?? "Previous stop"}
                        </p>
                        {travelSegment ? (
                          <>
                            <p className="mt-0.5">
                              {[travelDurationLabel, travelDistanceLabel].filter(Boolean).join(" · ") ||
                                "Travel details unavailable"}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                                {formatModeLabel(travelSegment.mode)}
                              </span>
                              {travelSegment.isFallback ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                  Estimated
                                </span>
                              ) : null}
                            </div>
                          </>
                        ) : (
                          <p className="mt-0.5 text-indigo-700">
                            Travel estimate unavailable for this leg. We&apos;ll keep your place on the map once we can locate it.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-gray-500">
              Add another stop to see door-to-door travel time estimates.
            </p>
          )}
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


