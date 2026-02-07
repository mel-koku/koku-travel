"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { featureFlags } from "@/lib/env/featureFlags";
import { mapboxService } from "@/lib/mapbox/mapService";
import { getCityMetadata } from "@/lib/tripBuilder/cityRelevance";

type MapboxModule = typeof import("mapbox-gl");

const MAP_STYLE = "mapbox://styles/mapbox/light-v11";
const DEFAULT_ZOOM = 5;
const JAPAN_CENTER: [number, number] = [138.2529, 36.2048];

const MARKER_COLOR = "#8c2f2f";
const ROUTE_COLOR = "#c6923a";

export function TripMap() {
  const { data } = useTripBuilder();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<InstanceType<MapboxModule["Map"]> | null>(null);
  const mapboxModuleRef = useRef<MapboxModule | null>(null);
  const markersRef = useRef<InstanceType<MapboxModule["Marker"]>[]>([]);
  const sourceIdRef = useRef<string | null>(null);
  const layerIdRef = useRef<string | null>(null);

  const [mapboxModuleLoaded, setMapboxModuleLoaded] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const mapboxEnabled = useMemo(
    () => featureFlags.enableMapbox && mapboxService.isEnabled(),
    []
  );

  const cities = data.cities ?? [];

  // Get city coordinates
  const cityCoordinates = useMemo(() => {
    return cities
      .map((city) => {
        const metadata = getCityMetadata(city);
        if (!metadata?.coordinates) return null;
        return {
          city,
          coordinates: metadata.coordinates,
        };
      })
      .filter(Boolean) as Array<{
      city: string;
      coordinates: { lat: number; lng: number };
    }>;
  }, [cities]);

  // Load Mapbox module
  useEffect(() => {
    if (!mapboxEnabled) {
      return;
    }

    let cancelled = false;
    import("mapbox-gl")
      .then((module) => {
        const mapboxgl = (
          "default" in module ? module.default : module
        ) as unknown as MapboxModule;
        (mapboxgl as MapboxModule & { accessToken: string }).accessToken =
          mapboxService.getAccessToken() ?? "";
        import("mapbox-gl/dist/mapbox-gl.css" as string).catch(() => {});
        if (!cancelled) {
          mapboxModuleRef.current = mapboxgl;
          setMapboxModuleLoaded(true);
        }
      })
      .catch(() => {
        // Silently fail - map just won't show
      });

    return () => {
      cancelled = true;
    };
  }, [mapboxEnabled]);

  // Initialize map
  useEffect(() => {
    const mapboxModule = mapboxModuleRef.current;
    if (!mapboxModule || !mapboxEnabled || !mapContainerRef.current) {
      return;
    }

    const map = new mapboxModule.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: JAPAN_CENTER,
      zoom: DEFAULT_ZOOM,
      interactive: false, // Disable interactions for preview
    });

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

  // Update markers and route when cities change
  useEffect(() => {
    const mapboxModule = mapboxModuleRef.current;
    const map = mapInstanceRef.current;
    if (!mapboxModule || !map || !mapReady) {
      return;
    }

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Clear existing route
    if (layerIdRef.current && map.getLayer(layerIdRef.current)) {
      map.removeLayer(layerIdRef.current);
    }
    if (sourceIdRef.current && map.getSource(sourceIdRef.current)) {
      map.removeSource(sourceIdRef.current);
    }

    if (cityCoordinates.length === 0) {
      return;
    }

    // Add markers for each city
    cityCoordinates.forEach((city, index) => {
      const markerEl = document.createElement("div");
      Object.assign(markerEl.style, {
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        backgroundColor: MARKER_COLOR,
        border: "2px solid white",
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "10px",
        fontWeight: "600",
        color: "#fff",
      });
      markerEl.textContent = String(index + 1);

      const marker = new mapboxModule.Marker({ element: markerEl })
        .setLngLat([city.coordinates.lng, city.coordinates.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Add route line if multiple cities
    if (cityCoordinates.length > 1) {
      const coordinates = cityCoordinates.map((c) => [
        c.coordinates.lng,
        c.coordinates.lat,
      ]) as [number, number][];

      const sourceId = "trip-route-source";
      const layerId = "trip-route-layer";

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

      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": ROUTE_COLOR,
          "line-width": 2,
          "line-opacity": 0.7,
          "line-dasharray": [2, 2],
        },
      });

      sourceIdRef.current = sourceId;
      layerIdRef.current = layerId;
    }

    // Fit bounds to show all markers
    const bounds = new mapboxModule.LngLatBounds();
    cityCoordinates.forEach((c) =>
      bounds.extend([c.coordinates.lng, c.coordinates.lat])
    );

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { maxZoom: 10, duration: 300, padding: 40 });
    }
  }, [cityCoordinates, mapReady]);

  if (!mapboxEnabled || cityCoordinates.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface">
        <p className="text-xs text-stone">
          {cityCoordinates.length === 0
            ? "Select cities to see them on the map"
            : "Map not configured"}
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-surface">
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-stone">Loading map...</p>
        </div>
      )}
      <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />

      {/* City labels */}
      <div className="pointer-events-none absolute bottom-2 left-2 right-2">
        <div className="flex flex-wrap gap-1">
          {cityCoordinates.slice(0, 5).map((c, i) => (
            <span
              key={c.city}
              className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-warm-gray shadow-sm"
            >
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-primary text-[8px] text-white">
                {i + 1}
              </span>
              {c.city}
            </span>
          ))}
          {cityCoordinates.length > 5 && (
            <span className="inline-flex items-center rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-stone shadow-sm">
              +{cityCoordinates.length - 5} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
