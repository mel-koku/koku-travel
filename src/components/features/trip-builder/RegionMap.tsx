"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { featureFlags } from "@/lib/env/featureFlags";
import { mapboxService } from "@/lib/mapbox/mapService";
import { REGION_DESCRIPTIONS } from "@/data/regionDescriptions";
import { mapColors } from "@/lib/mapColors";

type MapboxModule = typeof import("mapbox-gl");

const MAP_STYLE = "mapbox://styles/mapbox/light-v11";
const DEFAULT_ZOOM = 4.5;
const JAPAN_CENTER: [number, number] = [138.2529, 36.2048];

const SELECTED_COLOR = mapColors.brandPrimary;
const UNSELECTED_COLOR = "#9a8d7e";

export function RegionMap() {
  const { data } = useTripBuilder();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<InstanceType<MapboxModule["Map"]> | null>(null);
  const mapboxModuleRef = useRef<MapboxModule | null>(null);
  const markersRef = useRef<InstanceType<MapboxModule["Marker"]>[]>([]);

  const [mapboxModuleLoaded, setMapboxModuleLoaded] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const mapboxEnabled = useMemo(
    () => featureFlags.enableMapbox && mapboxService.isEnabled(),
    []
  );

  const selectedRegions = useMemo(
    () => new Set(data.regions ?? []),
    [data.regions]
  );

  // Get region coordinates
  const regionCoordinates = useMemo(() => {
    return REGION_DESCRIPTIONS.map((region) => ({
      id: region.id,
      name: region.name,
      coordinates: region.coordinates,
      isSelected: selectedRegions.has(region.id),
    }));
  }, [selectedRegions]);

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
      interactive: false, // Non-interactive preview
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

  // Update markers when regions change
  useEffect(() => {
    const mapboxModule = mapboxModuleRef.current;
    const map = mapInstanceRef.current;
    if (!mapboxModule || !map || !mapReady) {
      return;
    }

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add markers for each region
    regionCoordinates.forEach((region) => {
      const isSelected = region.isSelected;

      const markerEl = document.createElement("div");
      Object.assign(markerEl.style, {
        width: isSelected ? "32px" : "20px",
        height: isSelected ? "32px" : "20px",
        borderRadius: "50%",
        backgroundColor: isSelected ? SELECTED_COLOR : UNSELECTED_COLOR,
        border: isSelected ? "3px solid white" : "2px solid white",
        boxShadow: isSelected
          ? "0 4px 6px rgba(0,0,0,0.3)"
          : "0 2px 4px rgba(0,0,0,0.2)",
        transition: "all 0.2s ease",
        opacity: isSelected ? "1" : "0.6",
      });

      const marker = new mapboxModule.Marker({ element: markerEl })
        .setLngLat([region.coordinates.lng, region.coordinates.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Fit bounds to selected regions if any
    const selectedCoords = regionCoordinates.filter((r) => r.isSelected);
    if (selectedCoords.length > 0) {
      const bounds = new mapboxModule.LngLatBounds();
      selectedCoords.forEach((r) =>
        bounds.extend([r.coordinates.lng, r.coordinates.lat])
      );

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { maxZoom: 7, duration: 500, padding: 60 });
      }
    } else {
      // Reset to default view when nothing selected
      map.flyTo({
        center: JAPAN_CENTER,
        zoom: DEFAULT_ZOOM,
        duration: 500,
      });
    }
  }, [regionCoordinates, mapReady]);

  if (!mapboxEnabled) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface">
        <p className="text-xs text-stone">Map not configured</p>
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

      {/* Region labels for selected regions */}
      <div className="pointer-events-none absolute bottom-2 left-2 right-2">
        <div className="flex flex-wrap gap-1">
          {regionCoordinates
            .filter((r) => r.isSelected)
            .map((region) => (
              <span
                key={region.id}
                className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-brand-primary shadow-sm"
              >
                <span className="h-2 w-2 rounded-full bg-brand-primary" />
                {region.name}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}
