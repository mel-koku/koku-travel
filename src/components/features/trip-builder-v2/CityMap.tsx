"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import {
  type RegionId,
  REGION_VIEW_ZOOM_THRESHOLD,
  JAPAN_OVERVIEW_ZOOM,
} from "@/data/regionData";
import { featureFlags } from "@/lib/env/featureFlags";
import { mapboxService } from "@/lib/mapbox/mapService";
import {
  aggregateCitiesByRegion,
  getCitiesForRegion,
  getRegionBoundsArray,
  getRegionCenter,
  type RegionAggregation,
} from "@/lib/tripBuilder/regionAggregation";
import type { InterestId } from "@/types/trip";

type MapboxModule = typeof import("mapbox-gl");

const MAP_STYLE = "mapbox://styles/mapbox/light-v11";
const DEFAULT_ZOOM = JAPAN_OVERVIEW_ZOOM;
const JAPAN_CENTER: [number, number] = [138.2529, 36.2048];

const MARKER_BASE_COLOR = "#9CA3AF";
const MARKER_SELECTED_COLOR = "#4F46E5";
const MARKER_HIGHLIGHT_COLOR = "#10B981";
const REGION_MARKER_COLOR = "#3B82F6";

export type CityMapProps = {
  onCitySelect?: (city: string) => void;
  minRelevance?: number;
};

type MapViewMode = "regions" | "cities";

type MapState = {
  viewMode: MapViewMode;
  activeRegion: RegionId | null;
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
  const [mapState, setMapState] = useState<MapState>({
    viewMode: "regions",
    activeRegion: null,
  });

  // Track if zoom change is from programmatic animation to avoid immediate auto-switch
  const isAnimatingRef = useRef(false);

  const mapboxEnabled = useMemo(
    () => {
      const flagEnabled = featureFlags.enableMapbox;
      const serviceEnabled = mapboxService.isEnabled();
      const token = mapboxService.getAccessToken();
      console.log("[CityMap DEBUG] featureFlags.enableMapbox:", flagEnabled);
      console.log("[CityMap DEBUG] mapboxService.isEnabled():", serviceEnabled);
      console.log("[CityMap DEBUG] token present:", !!token, token ? `(${token.substring(0, 10)}...)` : "");
      return flagEnabled && serviceEnabled;
    },
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

  // Get region aggregations for region view
  const regionAggregations = useMemo(() => {
    return aggregateCitiesByRegion(selectedInterests, selectedCities, 50);
  }, [selectedInterests, selectedCities]);

  // Get cities for active region (city view)
  const citiesForRegion = useMemo(() => {
    if (mapState.viewMode !== "cities" || !mapState.activeRegion) {
      return [];
    }
    return getCitiesForRegion(
      mapState.activeRegion,
      selectedInterests,
      selectedCities,
      minRelevance
    );
  }, [mapState.viewMode, mapState.activeRegion, selectedInterests, selectedCities, minRelevance]);

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

  // Clear all selected cities
  const clearAllCities = useCallback(() => {
    setData((prev) => ({
      ...prev,
      cities: [],
    }));
  }, [setData]);

  // Expand a region to show its cities
  const expandRegion = useCallback((regionId: RegionId) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    isAnimatingRef.current = true;
    const bounds = getRegionBoundsArray(regionId);

    map.fitBounds(bounds, {
      padding: 50,
      duration: 800,
    });

    // Wait for animation to complete before switching view mode
    setTimeout(() => {
      setMapState({
        viewMode: "cities",
        activeRegion: regionId,
      });
      isAnimatingRef.current = false;
    }, 850);
  }, []);

  // Collapse back to region view
  const collapseToRegions = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    isAnimatingRef.current = true;

    map.flyTo({
      center: JAPAN_CENTER,
      zoom: DEFAULT_ZOOM,
      duration: 800,
    });

    setTimeout(() => {
      setMapState({
        viewMode: "regions",
        activeRegion: null,
      });
      isAnimatingRef.current = false;
    }, 850);
  }, []);

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

  // Auto-switch to region view when zooming out
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const handleZoomEnd = () => {
      if (isAnimatingRef.current) return;

      const zoom = map.getZoom();
      if (mapState.viewMode === "cities" && zoom < REGION_VIEW_ZOOM_THRESHOLD) {
        setMapState({
          viewMode: "regions",
          activeRegion: null,
        });
      }
    };

    map.on("zoomend", handleZoomEnd);
    return () => {
      map.off("zoomend", handleZoomEnd);
    };
  }, [mapReady, mapState.viewMode]);

  // Create region marker element
  const createRegionMarker = useCallback(
    (aggregation: RegionAggregation): HTMLElement => {
      const { region, cityCount, totalLocations, hasSelectedCities, averageRelevance, matchingCities } = aggregation;
      const hasInterests = selectedInterests.length > 0;

      const markerEl = document.createElement("div");
      markerEl.className = "koku-region-marker";

      // Determine marker color based on state
      let markerColor = REGION_MARKER_COLOR;
      if (hasSelectedCities) {
        markerColor = MARKER_SELECTED_COLOR;
      } else if (hasInterests && matchingCities > 0) {
        markerColor = MARKER_HIGHLIGHT_COLOR;
      }

      // Region markers are larger (56-72px)
      const baseSize = 56;
      const maxSize = 72;
      const sizeScale = Math.min(Math.log10(cityCount + 1) / 2.5, 1);
      const markerSize = Math.round(baseSize + (maxSize - baseSize) * sizeScale);

      Object.assign(markerEl.style, {
        width: `${markerSize}px`,
        height: `${markerSize}px`,
        borderRadius: "50%",
        backgroundColor: markerColor,
        border: hasSelectedCities ? "3px solid white" : "2px solid white",
        boxShadow: "0 3px 8px rgba(0,0,0,0.35)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
        opacity: hasInterests && matchingCities === 0 ? "0.5" : "1",
      });

      // Create inner content
      const nameSpan = document.createElement("span");
      nameSpan.textContent = region.name;
      Object.assign(nameSpan.style, {
        fontSize: "10px",
        fontWeight: "700",
        color: "#fff",
        lineHeight: "1.1",
        textAlign: "center",
      });

      const countSpan = document.createElement("span");
      countSpan.textContent = `${cityCount} cities`;
      Object.assign(countSpan.style, {
        fontSize: "8px",
        fontWeight: "500",
        color: "rgba(255,255,255,0.9)",
        lineHeight: "1.1",
      });

      markerEl.appendChild(nameSpan);
      markerEl.appendChild(countSpan);

      // Tooltip
      const tooltipLines = [
        region.name,
        `${cityCount} cities`,
        `${totalLocations.toLocaleString()} locations`,
      ];
      if (hasInterests) {
        tooltipLines.push(`${matchingCities} high-match cities`);
        tooltipLines.push(`${averageRelevance}% avg relevance`);
      }
      markerEl.setAttribute("title", tooltipLines.join("\n"));

      return markerEl;
    },
    [selectedInterests.length]
  );

  // Create city marker element
  const createCityMarker = useCallback(
    (
      city: { city: string; relevance: number; locationCount: number; isSelected: boolean },
      hasInterests: boolean
    ): HTMLElement => {
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
      markerEl.setAttribute(
        "title",
        `${city.city}\n${city.locationCount} locations${hasInterests ? `\n${city.relevance}% match` : ""}`
      );

      return markerEl;
    },
    []
  );

  // Update markers when data or view mode changes
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

    if (mapState.viewMode === "regions") {
      // Create region markers
      for (const [regionId, aggregation] of regionAggregations) {
        if (aggregation.cityCount === 0) continue;

        const markerEl = createRegionMarker(aggregation);
        const center = getRegionCenter(regionId);

        const marker = new mapboxModule.Marker({ element: markerEl })
          .setLngLat(center)
          .addTo(map);

        // Click to expand region
        marker.getElement().addEventListener("click", () => {
          expandRegion(regionId);
        });

        // Hover effect
        const originalBoxShadow = markerEl.style.boxShadow;
        marker.getElement().addEventListener("mouseenter", () => {
          markerEl.style.boxShadow =
            "0 0 0 5px rgba(59, 130, 246, 0.4), 0 3px 10px rgba(0,0,0,0.4)";
          markerEl.style.zIndex = "1000";
        });

        marker.getElement().addEventListener("mouseleave", () => {
          markerEl.style.boxShadow = originalBoxShadow;
          markerEl.style.zIndex = "auto";
        });

        markersRef.current.set(`region-${regionId}`, marker);
      }
    } else if (mapState.viewMode === "cities" && mapState.activeRegion) {
      // Create city markers for active region
      for (const city of citiesForRegion) {
        if (!city.coordinates) continue;

        const markerEl = createCityMarker(city, hasInterests);

        const marker = new mapboxModule.Marker({ element: markerEl })
          .setLngLat([city.coordinates.lng, city.coordinates.lat])
          .addTo(map);

        marker.getElement().addEventListener("click", () => {
          toggleCity(city.city);
        });

        // Hover effect
        const originalBoxShadow = markerEl.style.boxShadow;
        marker.getElement().addEventListener("mouseenter", () => {
          markerEl.style.boxShadow =
            "0 0 0 4px rgba(79, 70, 229, 0.4), 0 2px 8px rgba(0,0,0,0.4)";
          markerEl.style.zIndex = "1000";
        });

        marker.getElement().addEventListener("mouseleave", () => {
          markerEl.style.boxShadow = originalBoxShadow;
          markerEl.style.zIndex = "auto";
        });

        markersRef.current.set(city.city, marker);
      }
    }
  }, [
    mapState.viewMode,
    mapState.activeRegion,
    regionAggregations,
    citiesForRegion,
    mapReady,
    selectedInterests.length,
    toggleCity,
    expandRegion,
    createRegionMarker,
    createCityMarker,
  ]);

  // Get current region data for display
  const activeRegionData = useMemo(() => {
    if (!mapState.activeRegion) return null;
    return regionAggregations.get(mapState.activeRegion);
  }, [mapState.activeRegion, regionAggregations]);

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

      {/* Top-left controls */}
      {mapReady && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          {/* Back button (city view) */}
          {mapState.viewMode === "cities" && (
            <button
              onClick={collapseToRegions}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-lg transition-colors hover:bg-gray-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              All Regions
            </button>
          )}

          {/* Region indicator badge (city view) */}
          {mapState.viewMode === "cities" && activeRegionData && (
            <div className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
              {activeRegionData.region.name}
            </div>
          )}

          {/* Selected cities count + Clear all */}
          {selectedCities.size > 0 && (
            <>
              <div className="pointer-events-none rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
                {selectedCities.size} {selectedCities.size === 1 ? "city" : "cities"} selected
              </div>
              <button
                onClick={clearAllCities}
                className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 shadow-lg transition-colors hover:bg-red-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                Clear
              </button>
            </>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
        <p className="font-medium text-gray-900 mb-1">
          {mapState.viewMode === "regions" ? "Regions" : "Cities"}
        </p>
        <div className="flex flex-col gap-1">
          {mapState.viewMode === "regions" ? (
            <>
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: MARKER_SELECTED_COLOR }}
                />
                <span className="text-gray-600">Has selections</span>
              </div>
              {selectedInterests.length > 0 && (
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: MARKER_HIGHLIGHT_COLOR }}
                  />
                  <span className="text-gray-600">High-match cities</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: REGION_MARKER_COLOR }}
                />
                <span className="text-gray-600">Click to explore</span>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
        {mapState.viewMode === "regions" && (
          <p className="mt-2 text-[10px] text-gray-500">Click a region to see cities</p>
        )}
      </div>
    </div>
  );
}
