"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { featureFlags } from "@/lib/env/featureFlags";
import { mapboxService } from "@/lib/mapbox/mapService";
import {
  getCitiesByRelevance,
  getAllCities,
} from "@/lib/tripBuilder/cityRelevance";
import type { InterestId } from "@/types/trip";

type MapboxModule = typeof import("mapbox-gl");

const MAP_STYLE = "mapbox://styles/mapbox/light-v11";
const DEFAULT_ZOOM = 5;
const JAPAN_CENTER: [number, number] = [138.2529, 36.2048];

const MARKER_BASE_COLOR = "#9CA3AF";
const MARKER_SELECTED_COLOR = "#4F46E5";
const MARKER_HIGHLIGHT_COLOR = "#10B981";

export type CityMapProps = {
  onCitySelect?: (city: string) => void;
  minRelevance?: number;
};

type CityMarkerData = {
  city: string;
  relevance: number;
  locationCount: number;
  coordinates?: { lat: number; lng: number };
  isSelected: boolean;
};

export function CityMap({ onCitySelect, minRelevance = 0 }: CityMapProps) {
  const { data, setData } = useTripBuilder();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<InstanceType<MapboxModule["Map"]> | null>(null);
  const mapboxModuleRef = useRef<MapboxModule | null>(null);
  const markersRef = useRef<Map<string, InstanceType<MapboxModule["Marker"]>>>(
    new Map()
  );

  const [mapboxModuleLoaded, setMapboxModuleLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const mapboxEnabled = useMemo(
    () => featureFlags.enableMapbox && mapboxService.isEnabled(),
    []
  );

  const selectedInterests = useMemo<InterestId[]>(
    () => data.interests ?? [],
    [data.interests]
  );

  const selectedCities = useMemo<Set<string>>(
    () => new Set(data.cities ?? []),
    [data.cities]
  );

  // Get cities with relevance data
  const cityData = useMemo<CityMarkerData[]>(() => {
    const hasInterests = selectedInterests.length > 0;

    if (hasInterests) {
      return getCitiesByRelevance(selectedInterests)
        .filter((c) => c.coordinates && c.relevance >= minRelevance)
        .map((c) => ({
          city: c.city,
          relevance: c.relevance,
          locationCount: c.locationCount,
          coordinates: c.coordinates,
          isSelected: selectedCities.has(c.city),
        }));
    }

    // No interests selected - show all cities
    return getAllCities()
      .filter((c) => c.coordinates)
      .map((c) => ({
        city: c.city,
        relevance: 0,
        locationCount: c.locationCount,
        coordinates: c.coordinates,
        isSelected: selectedCities.has(c.city),
      }));
  }, [selectedInterests, selectedCities, minRelevance]);

  const toggleCity = useCallback(
    (city: string) => {
      setData((prev) => {
        const current = new Set(prev.cities ?? []);
        if (current.has(city)) {
          current.delete(city);
        } else {
          current.add(city);
        }
        return {
          ...prev,
          cities: Array.from(current),
        };
      });
      onCitySelect?.(city);
    },
    [setData, onCitySelect]
  );

  // Load Mapbox module
  useEffect(() => {
    if (!mapboxEnabled) {
      setMapError(
        "Map is not configured. Set ROUTING_MAPBOX_ACCESS_TOKEN to enable."
      );
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
      .catch((error) => {
        if (!cancelled) {
          setMapError(
            (error as Error).message ?? "Failed to load map library"
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
    if (!mapboxModule || !mapboxEnabled || !mapContainerRef.current) {
      return;
    }

    const map = new mapboxModule.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: JAPAN_CENTER,
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

  // Update markers when data changes
  useEffect(() => {
    const mapboxModule = mapboxModuleRef.current;
    const map = mapInstanceRef.current;
    if (!mapboxModule || !map || !mapReady) {
      return;
    }

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    const hasInterests = selectedInterests.length > 0;

    // Create markers for cities
    cityData.forEach((city) => {
      if (!city.coordinates) return;

      const markerEl = document.createElement("div");
      markerEl.className = "koku-city-marker";

      // Determine marker color based on state
      let markerColor = MARKER_BASE_COLOR;
      if (city.isSelected) {
        markerColor = MARKER_SELECTED_COLOR;
      } else if (hasInterests && city.relevance >= 50) {
        markerColor = MARKER_HIGHLIGHT_COLOR;
      }

      // Calculate marker size based on location count (min 24, max 48)
      const baseSize = 24;
      const maxSize = 48;
      const sizeScale = Math.min(Math.log10(city.locationCount + 1) / 2, 1);
      const markerSize = Math.round(baseSize + (maxSize - baseSize) * sizeScale);

      // Apply opacity based on relevance when interests are selected
      const opacity = hasInterests && city.relevance < 50 ? 0.4 : 1;

      Object.assign(markerEl.style, {
        width: `${markerSize}px`,
        height: `${markerSize}px`,
        borderRadius: "50%",
        backgroundColor: markerColor,
        border: city.isSelected ? "3px solid white" : "2px solid white",
        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "10px",
        fontWeight: "600",
        color: "#fff",
        transition: "all 0.2s ease",
        opacity: String(opacity),
      });

      // Show location count for larger markers
      if (markerSize >= 32) {
        markerEl.textContent = String(city.locationCount);
      }

      // Add tooltip with city name and relevance
      markerEl.setAttribute("title", `${city.city}\n${city.locationCount} locations${hasInterests ? `\n${city.relevance}% match` : ""}`);

      const marker = new mapboxModule.Marker({ element: markerEl })
        .setLngLat([city.coordinates.lng, city.coordinates.lat])
        .addTo(map);

      marker.getElement().addEventListener("click", () => {
        toggleCity(city.city);
      });

      // Add hover effect
      marker.getElement().addEventListener("mouseenter", () => {
        markerEl.style.transform = "scale(1.15)";
        markerEl.style.zIndex = "1000";
      });

      marker.getElement().addEventListener("mouseleave", () => {
        markerEl.style.transform = "scale(1)";
        markerEl.style.zIndex = "auto";
      });

      markersRef.current.set(city.city, marker);
    });
  }, [cityData, mapReady, selectedInterests.length, toggleCity]);

  if (!mapboxEnabled) {
    return (
      <div className="flex h-full min-h-[300px] w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="text-center">
          <p className="text-sm text-gray-600">Map not available</p>
          <p className="mt-1 text-xs text-gray-500">
            Configure ROUTING_MAPBOX_ACCESS_TOKEN to enable the map.
          </p>
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="flex h-full min-h-[300px] w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-600 text-center">{mapError}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[300px] w-full rounded-xl border border-gray-200 bg-gray-100 overflow-hidden">
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-gray-600">Loading map...</p>
        </div>
      )}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 h-full w-full"
        aria-label="Interactive map for selecting cities"
      />

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
        <p className="font-medium text-gray-900 mb-1">Legend</p>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: MARKER_SELECTED_COLOR }}
            />
            <span className="text-gray-600">Selected</span>
          </div>
          {selectedInterests.length > 0 && (
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: MARKER_HIGHLIGHT_COLOR }}
              />
              <span className="text-gray-600">High match</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: MARKER_BASE_COLOR }}
            />
            <span className="text-gray-600">Available</span>
          </div>
        </div>
      </div>

      {/* Selected cities count */}
      {selectedCities.size > 0 && (
        <div className="pointer-events-none absolute top-3 left-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
          {selectedCities.size} {selectedCities.size === 1 ? "city" : "cities"} selected
        </div>
      )}
    </div>
  );
}
