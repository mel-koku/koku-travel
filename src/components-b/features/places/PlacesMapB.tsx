"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { featureFlags } from "@/lib/env/featureFlags";
import { mapboxService } from "@/lib/mapbox/mapService";
import { getCategoryHexColor } from "@/lib/itinerary/activityColors";
import { debounce } from "@/lib/utils";
import type { Location } from "@/types/location";

const MAP_STYLE = "mapbox://styles/mapbox/light-v11";
const DEFAULT_CENTER: [number, number] = [136.9, 35.7];
const DEFAULT_ZOOM = 5;

// B cluster palette — Ai-iro navy steps
const CLUSTER_SMALL = "#2D4B8E";
const CLUSTER_MEDIUM = "#3A5FA0";
const CLUSTER_LARGE = "#059669";

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

export type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

type PlacesMapBProps = {
  locations: Location[];
  onBoundsChange: (bounds: MapBounds) => void;
  onLocationClick: (location: Location) => void;
  highlightedLocationId: string | null;
  onHoverChange: (locationId: string | null) => void;
  showResetButton?: boolean;
  flyToLocation?: Location | null;
};

function buildFeatureCollection(locations: Location[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: locations
      .filter((loc) => loc.coordinates?.lat != null && loc.coordinates?.lng != null)
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

function hashId(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const SOURCE_ID = "places-locations";
const CLUSTER_LAYER = "places-clusters";
const CLUSTER_COUNT_LAYER = "places-cluster-count";
const UNCLUSTERED_LAYER = "places-unclustered-point";
const UNCLUSTERED_LABEL_LAYER = "places-unclustered-label";

export function PlacesMapB({
  locations,
  onBoundsChange,
  onLocationClick,
  highlightedLocationId,
  onHoverChange,
  showResetButton,
  flyToLocation,
}: PlacesMapBProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<InstanceType<MapboxModule["Map"]> | null>(null);
  const mapboxModuleRef = useRef<MapboxModule | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapboxModuleLoaded, setMapboxModuleLoaded] = useState(false);
  const hasFittedBounds = useRef(false);
  const prevHighlightRef = useRef<number | null>(null);
  const locationLookupRef = useRef<Map<number, Location>>(new Map());
  const featureCollectionRef = useRef<GeoJSON.FeatureCollection>({ type: "FeatureCollection", features: [] });

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
  }, [locations.length]);

  const debouncedBoundsChange = useMemo(
    () => debounce(onBoundsChange, 300),
    [onBoundsChange],
  );

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
          setMapError((error as Error).message ?? "Failed to load Mapbox GL JS");
        }
      });
    return () => { cancelled = true; };
  }, [mapboxEnabled]);

  // Initialize map
  useEffect(() => {
    const mapboxModule = mapboxModuleRef.current;
    if (!mapboxModule || !mapboxEnabled || !mapContainerRef.current) return;

    const map = new mapboxModule.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      projection: "mercator" as never,
    });
    map.addControl(new mapboxModule.NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: featureCollectionRef.current,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles — navy stepped palette
      map.addLayer({
        id: CLUSTER_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            CLUSTER_SMALL,
            20,
            CLUSTER_MEDIUM,
            100,
            CLUSTER_LARGE,
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            16,
            20,
            20,
            100,
            26,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.6)",
        },
      });

      // Cluster count labels
      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Individual points
      map.addLayer({
        id: UNCLUSTERED_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "highlighted"], false],
            11,
            7,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.8)",
          "circle-opacity": 0.9,
        },
      });

      // Location labels — dark text with white halo for light map
      map.addLayer({
        id: UNCLUSTERED_LABEL_LAYER,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
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
          "text-color": "#1a1d21",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });

      setMapReady(true);
    });

    // Report bounds on move
    map.on("moveend", () => {
      if (!mapContainerRef.current || mapContainerRef.current.clientWidth === 0) return;
      const bounds = map.getBounds();
      if (bounds) {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        debouncedBoundsChange({
          north: ne.lat,
          south: sw.lat,
          east: ne.lng,
          west: sw.lng,
        });
      }
    });

    // Click cluster → zoom
    map.on("click", CLUSTER_LAYER, (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER] });
      const clusterId = features[0]?.properties?.cluster_id;
      if (clusterId == null) return;
      const source = map.getSource(SOURCE_ID) as InstanceType<MapboxModule["GeoJSONSource"]>;
      source.getClusterExpansionZoom(
        clusterId,
        ((err: unknown, zoom: unknown) => {
          if (err || !features[0]?.geometry || typeof zoom !== "number") return;
          const geom = features[0].geometry as GeoJSON.Point;
          map.easeTo({ center: geom.coordinates as [number, number], zoom });
        }) as Parameters<typeof source.getClusterExpansionZoom>[1],
      );
    });

    // Click point → select
    map.on("click", UNCLUSTERED_LAYER, (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const numId = feature.id as number;
      const loc = locationLookupRef.current.get(numId);
      if (loc) onLocationClick(loc);
    });

    // Hover
    map.on("mouseenter", UNCLUSTERED_LAYER, (e) => {
      map.getCanvas().style.cursor = "pointer";
      const feature = e.features?.[0];
      if (feature?.properties?.locationId) onHoverChange(feature.properties.locationId);
    });
    map.on("mouseleave", UNCLUSTERED_LAYER, () => {
      map.getCanvas().style.cursor = "";
      onHoverChange(null);
    });
    map.on("mouseenter", CLUSTER_LAYER, () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", CLUSTER_LAYER, () => { map.getCanvas().style.cursor = ""; });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      setMapReady(false);
      hasFittedBounds.current = false;
    };
  }, [mapboxModuleLoaded, mapboxEnabled, debouncedBoundsChange, onLocationClick, onHoverChange]);

  // Update source data
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const source = map.getSource(SOURCE_ID) as InstanceType<MapboxModule["GeoJSONSource"]> | undefined;
    if (source) source.setData(featureCollection);

    if (!hasFittedBounds.current && featureCollection.features.length > 0) {
      hasFittedBounds.current = true;
      if (!flyToLocation?.coordinates) {
        const mapboxModule = mapboxModuleRef.current;
        if (mapboxModule) {
          const bounds = new mapboxModule.LngLatBounds();
          for (const feature of featureCollection.features) {
            const geom = feature.geometry as GeoJSON.Point;
            bounds.extend(geom.coordinates as [number, number]);
          }
          if (!bounds.isEmpty()) {
            map.fitBounds(bounds, { maxZoom: 12, duration: 600, padding: 40 });
          }
        }
      }
    }
  }, [featureCollection, mapReady, flyToLocation]);

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
      } catch { /* Feature may no longer exist */ }
    }

    if (highlightedLocationId) {
      const numId = hashId(highlightedLocationId);
      try {
        map.setFeatureState(
          { source: SOURCE_ID, id: numId },
          { highlighted: true },
        );
        prevHighlightRef.current = numId;
      } catch {
        prevHighlightRef.current = null;
      }
    } else {
      prevHighlightRef.current = null;
    }
  }, [highlightedLocationId, mapReady]);

  // Fly to location
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !flyToLocation?.coordinates) return;
    const { lat, lng } = flyToLocation.coordinates;
    map.flyTo({ center: [lng, lat], zoom: 14, duration: 1400 });
  }, [flyToLocation, mapReady]);

  // Reset to Japan
  const resetToJapan = useCallback(() => {
    const map = mapInstanceRef.current;
    const mapboxModule = mapboxModuleRef.current;
    if (!map || !mapboxModule || !mapReady) return;

    const fc = featureCollectionRef.current;
    if (fc.features.length > 0) {
      const bounds = new mapboxModule.LngLatBounds();
      for (const feature of fc.features) {
        const geom = feature.geometry as GeoJSON.Point;
        bounds.extend(geom.coordinates as [number, number]);
      }
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { maxZoom: 12, duration: 1200, padding: 40 });
      }
    } else {
      map.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, duration: 1200 });
    }
  }, [mapReady]);

  // Resize helper
  const resizeMap = useCallback(() => { mapInstanceRef.current?.resize(); }, []);
  useEffect(() => {
    const container = mapContainerRef.current;
    if (container) {
      (container as HTMLDivElement & { __resizeMap?: () => void }).__resizeMap = resizeMap;
    }
  }, [resizeMap]);

  if (!accessToken || !mapboxEnabled) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-center text-sm text-[var(--muted-foreground)]">
          Map requires a Mapbox token.
        </p>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-sm text-[var(--muted-foreground)] text-center">{mapError}</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[var(--surface)]" style={{ position: "relative" }}>
      {!mapReady && (
        <div className="flex items-center justify-center bg-[var(--surface)] rounded-2xl" style={{ position: "absolute", inset: 0, zIndex: 1 }}>
          <p className="text-sm text-[var(--muted-foreground)]">Loading map...</p>
        </div>
      )}
      <div
        ref={mapContainerRef}
        className="h-full w-full bg-[var(--surface)]"
        style={{ position: "absolute", inset: 0 }}
        aria-label="Map showing locations across Japan"
      />
      {showResetButton && (
        <button
          type="button"
          onClick={resetToJapan}
          className="flex items-center gap-1.5 rounded-xl bg-white/90 px-3.5 py-2 text-xs font-medium text-[var(--foreground)] backdrop-blur-sm transition-colors hover:bg-white active:scale-[0.98]"
          style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10, boxShadow: "var(--shadow-elevated)" }}
          aria-label="Reset map view to Japan"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 1.5V4M8 12v2.5M1.5 8H4M12 8h2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Back to Japan
        </button>
      )}
    </div>
  );
}
