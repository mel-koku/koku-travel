"use client";

import { useEffect, useRef, useState } from "react";
import { mapboxService } from "@/lib/mapbox/mapService";
import { featureFlags } from "@/lib/env/featureFlags";
import { env } from "@/lib/env";
import { getCategoryHexColor } from "@/lib/itinerary/activityColors";
import type { Location } from "@/types/location";

const MAP_STYLE = env.mapboxStyleUrl;
type MapboxModule = typeof import("mapbox-gl");

export type NearbyLocation = Location & { distance: number };

type NearMeMapProps = {
  userLocation: { lat: number; lng: number };
  locations: NearbyLocation[];
  selectedId: string | null;
  onLocationClick: (location: NearbyLocation) => void;
};

function ensurePulseStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById("near-me-pulse-style")) return;
  const style = document.createElement("style");
  style.id = "near-me-pulse-style";
  style.textContent = `
    @keyframes nmPulse {
      0%, 100% { box-shadow: 0 0 0 4px rgba(59,130,246,0.35); }
      50% { box-shadow: 0 0 0 10px rgba(59,130,246,0.05); }
    }
  `;
  document.head.appendChild(style);
}

function applyMarkerStyle(el: HTMLElement, isSelected: boolean, color: string) {
  Object.assign(el.style, {
    width: isSelected ? "20px" : "14px",
    height: isSelected ? "20px" : "14px",
    borderRadius: "50%",
    backgroundColor: color,
    border: isSelected ? "3px solid white" : "2px solid white",
    boxShadow: isSelected
      ? `0 0 0 4px ${color}55, 0 2px 8px rgba(0,0,0,0.3)`
      : "0 2px 5px rgba(0,0,0,0.3)",
    cursor: "pointer",
    transition: "all 0.15s ease",
  });
}

export function NearMeMap({ userLocation, locations, selectedId, onLocationClick }: NearMeMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<InstanceType<MapboxModule["Map"]> | null>(null);
  const mapboxModuleRef = useRef<MapboxModule | null>(null);
  const markersRef = useRef<Map<string, InstanceType<MapboxModule["Marker"]>>>(new Map());
  const handlersRef = useRef<Map<string, () => void>>(new Map());
  const userMarkerRef = useRef<InstanceType<MapboxModule["Marker"]> | null>(null);
  const hasFittedRef = useRef(false);
  // Keep callback stable in handlers without including in effect deps
  const onClickRef = useRef(onLocationClick);
  useEffect(() => { onClickRef.current = onLocationClick; });

  const [mapReady, setMapReady] = useState(false);
  const [mapboxLoaded, setMapboxLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapboxEnabled = featureFlags.enableMapbox && mapboxService.isEnabled();

  useEffect(() => {
    ensurePulseStyle();
  }, []);

  useEffect(() => {
    if (!mapboxEnabled) return;
    let cancelled = false;
    import("mapbox-gl")
      .then((module) => {
        const mapboxgl = ("default" in module ? module.default : module) as unknown as MapboxModule;
        (mapboxgl as MapboxModule & { accessToken: string }).accessToken =
          mapboxService.getAccessToken() ?? "";
        import("mapbox-gl/dist/mapbox-gl.css" as string).catch(() => {});
        if (!cancelled) {
          mapboxModuleRef.current = mapboxgl;
          setMapboxLoaded(true);
        }
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message ?? "Failed to load map");
      });
    return () => { cancelled = true; };
  }, [mapboxEnabled]);

  useEffect(() => {
    const mapboxModule = mapboxModuleRef.current;
    if (!mapboxModule || !mapboxEnabled || !mapContainerRef.current) return;

    const map = new mapboxModule.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: [userLocation.lng, userLocation.lat],
      zoom: 14,
      scrollZoom: true,
    });
    map.addControl(new mapboxModule.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("load", () => setMapReady(true));
    mapInstanceRef.current = map;

    const markers = markersRef.current;
    const handlers = handlersRef.current;
    return () => {
      handlers.forEach((h, id) => markers.get(id)?.getElement().removeEventListener("click", h));
      handlers.clear();
      markers.clear();
      userMarkerRef.current = null;
      map.remove();
      mapInstanceRef.current = null;
      setMapReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxLoaded, mapboxEnabled]);

  // Markers + bounds
  useEffect(() => {
    const mapboxModule = mapboxModuleRef.current;
    const map = mapInstanceRef.current;
    if (!mapboxModule || !map || !mapReady) return;

    // User location dot (created once)
    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      Object.assign(el.style, {
        width: "16px",
        height: "16px",
        borderRadius: "50%",
        backgroundColor: "#3B82F6",
        border: "3px solid white",
        animation: "nmPulse 2s ease-in-out infinite",
      });
      userMarkerRef.current = new mapboxModule.Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);
    }

    // Clear place markers
    markersRef.current.forEach((marker, id) => {
      const h = handlersRef.current.get(id);
      if (h) marker.getElement().removeEventListener("click", h);
      marker.remove();
    });
    markersRef.current.clear();
    handlersRef.current.clear();

    // Place markers
    for (const loc of locations) {
      if (!loc.coordinates) continue;
      const isSelected = loc.id === selectedId;
      const color = getCategoryHexColor(loc.category);

      const el = document.createElement("div");
      applyMarkerStyle(el, isSelected, color);
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", loc.name);
      el.title = loc.name;

      const marker = new mapboxModule.Marker({ element: el })
        .setLngLat([loc.coordinates.lng, loc.coordinates.lat])
        .addTo(map);

      const handler = () => onClickRef.current(loc);
      el.addEventListener("click", handler);
      markersRef.current.set(loc.id, marker);
      handlersRef.current.set(loc.id, handler);
    }

    // Fit bounds once when locations first arrive
    if (!hasFittedRef.current && locations.length > 0) {
      hasFittedRef.current = true;
      const bounds = new mapboxModule.LngLatBounds();
      bounds.extend([userLocation.lng, userLocation.lat]);
      for (const loc of locations) {
        if (loc.coordinates) bounds.extend([loc.coordinates.lng, loc.coordinates.lat]);
      }
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { maxZoom: 15, duration: 600, padding: 40 });
      }
    }

    // Fly to selected pin
    if (selectedId) {
      const loc = locations.find((l) => l.id === selectedId);
      if (loc?.coordinates) {
        map.easeTo({ center: [loc.coordinates.lng, loc.coordinates.lat], duration: 350 });
      }
    }
  }, [mapReady, locations, selectedId, userLocation.lat, userLocation.lng]);

  if (!mapboxEnabled || error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-canvas text-sm text-foreground-secondary">
        Map unavailable
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-canvas">
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-foreground-secondary">
          Loading map...
        </div>
      )}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 h-full w-full"
        aria-label="Map showing nearby places"
      />
    </div>
  );
}
