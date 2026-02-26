"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { featureFlags } from "@/lib/env/featureFlags";
import { mapboxService } from "@/lib/mapbox/mapService";
import { getCategoryHexColor } from "@/lib/itinerary/activityColors";
import type { Location } from "@/types/location";
import type { NearbyLocation } from "@/hooks/useLocationsQuery";

const MAP_STYLE = "mapbox://styles/mapbox/light-v11";
const DEFAULT_CENTER: [number, number] = [139.7671, 35.6812]; // Tokyo Station
const DEFAULT_ZOOM = 14;

type MapboxModule = typeof import("mapbox-gl");

let _mapboxPromise: Promise<MapboxModule> | null = null;

function getMapboxModule(): Promise<MapboxModule> {
  if (_mapboxPromise) return _mapboxPromise;

  _mapboxPromise = import("mapbox-gl").then((module) => {
    const mapboxgl = (
      "default" in module ? module.default : module
    ) as unknown as MapboxModule;
    (mapboxgl as MapboxModule & { accessToken: string }).accessToken =
      mapboxService.getAccessToken() ?? "";
    import("mapbox-gl/dist/mapbox-gl.css" as string).catch(() => {});
    return mapboxgl;
  });

  return _mapboxPromise;
}

if (typeof window !== "undefined" && featureFlags.enableMapbox) {
  getMapboxModule();
}

function hashId(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function buildFeatureCollection(
  locations: NearbyLocation[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: locations
      .filter(
        (loc) => loc.coordinates?.lat != null && loc.coordinates?.lng != null,
      )
      .map((loc) => ({
        type: "Feature" as const,
        id: hashId(loc.id),
        properties: {
          locationId: loc.id,
          name: loc.name,
          category: loc.category,
          color: getCategoryHexColor(loc.category),
        },
        geometry: {
          type: "Point" as const,
          coordinates: [loc.coordinates!.lng, loc.coordinates!.lat],
        },
      })),
  };
}

const SOURCE_ID = "discover-locations";
const USER_SOURCE_ID = "user-location";
const UNCLUSTERED_LAYER = "discover-point";
const UNCLUSTERED_LABEL_LAYER = "discover-label";
const USER_DOT_LAYER = "user-dot";
const USER_PULSE_LAYER = "user-pulse";

type DiscoverMapBProps = {
  locations: NearbyLocation[];
  userPosition: { lat: number; lng: number } | null;
  onLocationClick: (location: Location) => void;
  onHoverChange?: (locationId: string | null) => void;
  highlightedLocationId: string | null;
  isLoading: boolean;
};

export function DiscoverMapB({
  locations,
  userPosition,
  onLocationClick,
  onHoverChange,
  highlightedLocationId,
  isLoading,
}: DiscoverMapBProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<InstanceType<MapboxModule["Map"]> | null>(null);
  const mapboxModuleRef = useRef<MapboxModule | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapboxModuleLoaded, setMapboxModuleLoaded] = useState(false);
  const prevHighlightRef = useRef<number | null>(null);
  const locationLookupRef = useRef<Map<number, Location>>(new Map());
  const featureCollectionRef = useRef<GeoJSON.FeatureCollection>({
    type: "FeatureCollection",
    features: [],
  });
  const hasCenteredOnUser = useRef(false);
  const pulseAnimRef = useRef<number | null>(null);

  const mapboxEnabled = useMemo(
    () => featureFlags.enableMapbox && mapboxService.isEnabled(),
    [],
  );
  const accessToken = useMemo(() => mapboxService.getAccessToken(), []);

  const featureCollection = useMemo(() => {
    const fc = buildFeatureCollection(locations);
    const lookup = new Map<number, Location>();
    for (const loc of locations) {
      if (loc.coordinates?.lat != null && loc.coordinates?.lng != null) {
        lookup.set(hashId(loc.id), loc);
      }
    }
    locationLookupRef.current = lookup;
    featureCollectionRef.current = fc;
    return fc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations.length, locations]);

  // Load mapbox module
  useEffect(() => {
    if (!mapboxEnabled) return;

    let cancelled = false;
    getMapboxModule()
      .then((mapboxgl) => {
        if (!cancelled) {
          mapboxModuleRef.current = mapboxgl;
          setMapboxModuleLoaded(true);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMapError(
            (error as Error).message ?? "Failed to load Mapbox GL JS",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mapboxEnabled]);

  // Initialize map
  useEffect(() => {
    const mapboxModule = mapboxModuleRef.current;
    if (!mapboxModule || !mapboxEnabled || !mapContainerRef.current) return;

    const center: [number, number] = userPosition
      ? [userPosition.lng, userPosition.lat]
      : DEFAULT_CENTER;

    const map = new mapboxModule.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center,
      zoom: DEFAULT_ZOOM,
    });
    map.addControl(new mapboxModule.NavigationControl(), "top-right");

    map.on("load", () => {
      // User location source
      map.addSource(USER_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // User pulse ring
      map.addLayer({
        id: USER_PULSE_LAYER,
        type: "circle",
        source: USER_SOURCE_ID,
        paint: {
          "circle-color": "#4A90D9",
          "circle-radius": 20,
          "circle-opacity": 0.15,
          "circle-stroke-width": 0,
        },
      });

      // User dot
      map.addLayer({
        id: USER_DOT_LAYER,
        type: "circle",
        source: USER_SOURCE_ID,
        paint: {
          "circle-color": "#4A90D9",
          "circle-radius": 8,
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 1,
        },
      });

      // Locations source
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: featureCollectionRef.current,
        cluster: false,
      });

      // Location points
      map.addLayer({
        id: UNCLUSTERED_LAYER,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "highlighted"], false],
            11,
            7,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 1,
        },
      });

      // Location name labels
      map.addLayer({
        id: UNCLUSTERED_LABEL_LAYER,
        type: "symbol",
        source: SOURCE_ID,
        minzoom: 10,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          "text-size": 12,
          "text-anchor": "top",
          "text-offset": [0, 1],
          "text-max-width": 9,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#1A1D21",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
        },
      });

      setMapReady(true);
    });

    // Click location point
    map.on("click", UNCLUSTERED_LAYER, (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const numId = feature.id as number;
      const loc = locationLookupRef.current.get(numId);
      if (loc) onLocationClick(loc);
    });

    // Hover cursor + sync
    map.on("mouseenter", UNCLUSTERED_LAYER, (e) => {
      map.getCanvas().style.cursor = "pointer";
      const feature = e.features?.[0];
      if (feature?.properties?.locationId) onHoverChange?.(feature.properties.locationId);
    });
    map.on("mouseleave", UNCLUSTERED_LAYER, () => {
      map.getCanvas().style.cursor = "";
      onHoverChange?.(null);
    });

    mapInstanceRef.current = map;

    return () => {
      if (pulseAnimRef.current) cancelAnimationFrame(pulseAnimRef.current);
      map.remove();
      mapInstanceRef.current = null;
      setMapReady(false);
      hasCenteredOnUser.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxModuleLoaded, mapboxEnabled]);

  // Update user location on map + fly to on first position
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !userPosition) return;

    const userGeoJSON: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [userPosition.lng, userPosition.lat],
          },
        },
      ],
    };

    const source = map.getSource(USER_SOURCE_ID) as InstanceType<
      MapboxModule["GeoJSONSource"]
    > | undefined;
    if (source) {
      source.setData(userGeoJSON);
    }

    // Fly to user on first position
    if (!hasCenteredOnUser.current) {
      hasCenteredOnUser.current = true;
      map.flyTo({
        center: [userPosition.lng, userPosition.lat],
        zoom: DEFAULT_ZOOM,
        duration: 1400,
      });
    }

    // Start pulse animation
    if (pulseAnimRef.current) cancelAnimationFrame(pulseAnimRef.current);
    let start: number | null = null;

    function animatePulse(timestamp: number) {
      if (!start) start = timestamp;
      const elapsed = (timestamp - start) % 2000;
      const progress = elapsed / 2000;
      const radius = 12 + progress * 20;
      const opacity = 0.25 * (1 - progress);

      const currentMap = mapInstanceRef.current;
      if (currentMap && currentMap.getLayer(USER_PULSE_LAYER)) {
        currentMap.setPaintProperty(USER_PULSE_LAYER, "circle-radius", radius);
        currentMap.setPaintProperty(
          USER_PULSE_LAYER,
          "circle-opacity",
          opacity,
        );
      }
      pulseAnimRef.current = requestAnimationFrame(animatePulse);
    }
    pulseAnimRef.current = requestAnimationFrame(animatePulse);

    return () => {
      if (pulseAnimRef.current) cancelAnimationFrame(pulseAnimRef.current);
    };
  }, [userPosition, mapReady]);

  // Update location data
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const source = map.getSource(SOURCE_ID) as InstanceType<
      MapboxModule["GeoJSONSource"]
    > | undefined;
    if (source) {
      source.setData(featureCollection);
    }
  }, [featureCollection, mapReady]);

  // Highlight sync
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    if (prevHighlightRef.current != null) {
      try {
        map.setFeatureState(
          { source: SOURCE_ID, id: prevHighlightRef.current },
          { highlighted: false },
        );
      } catch {
        // Feature may no longer exist
      }
    }

    if (highlightedLocationId) {
      const numId = hashId(highlightedLocationId);
      try {
        map.setFeatureState(
          { source: SOURCE_ID, id: numId },
          { highlighted: true },
        );
        prevHighlightRef.current = numId;

        // Fly to highlighted location
        const loc = locationLookupRef.current.get(numId);
        if (loc?.coordinates) {
          map.flyTo({
            center: [loc.coordinates.lng, loc.coordinates.lat],
            zoom: Math.max(map.getZoom(), 15),
            duration: 800,
          });
        }
      } catch {
        prevHighlightRef.current = null;
      }
    } else {
      prevHighlightRef.current = null;
    }
  }, [highlightedLocationId, mapReady]);

  // Recenter on user
  const recenterOnUser = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !userPosition) return;
    map.flyTo({
      center: [userPosition.lng, userPosition.lat],
      zoom: DEFAULT_ZOOM,
      duration: 1200,
    });
  }, [userPosition]);

  if (!accessToken || !mapboxEnabled) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-[var(--surface)] p-4">
        <p className="text-center text-sm text-[var(--muted-foreground)]">
          Map requires a Mapbox token.
        </p>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-[var(--surface)] p-4">
        <p className="text-sm text-[var(--muted-foreground)] text-center">
          {mapError}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[var(--surface)]" style={{ position: "relative" }}>
      {!mapReady && (
        <div
          className="flex items-center justify-center bg-[var(--surface)]"
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
        >
          <p className="text-sm text-[var(--muted-foreground)]">Loading map...</p>
        </div>
      )}
      <div
        ref={mapContainerRef}
        className="h-full w-full bg-[var(--surface)]"
        style={{ position: "absolute", inset: 0 }}
        data-lenis-prevent
        aria-label="Map showing nearby locations"
      />

      {/* Loading overlay for location data */}
      {isLoading && mapReady && (
        <div
          className="flex items-center justify-center"
          style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}
        >
          <div
            className="rounded-2xl bg-white px-4 py-3 flex items-center gap-2"
            style={{ boxShadow: "var(--shadow-elevated)" }}
          >
            <div className="h-4 w-4 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
            <span className="text-xs text-[var(--muted-foreground)]">
              Finding places...
            </span>
          </div>
        </div>
      )}

      {/* Recenter button */}
      {userPosition && mapReady && (
        <button
          type="button"
          onClick={recenterOnUser}
          className="flex items-center gap-1.5 rounded-2xl bg-white px-3 py-2 text-xs font-medium text-[var(--foreground)] transition-shadow hover:shadow-[var(--shadow-elevated)] active:scale-[0.98]"
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            zIndex: 5,
            boxShadow: "var(--shadow-card)",
          }}
          aria-label="Recenter on my location"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M8 1.5V4M8 12v2.5M1.5 8H4M12 8h2.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Back to me
        </button>
      )}
    </div>
  );
}
