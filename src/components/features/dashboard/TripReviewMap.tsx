"use client";

import { useEffect, useRef } from "react";
import { mapboxService } from "@/lib/mapbox/mapService";

const MAP_STYLE = "mapbox://styles/mel-koku/cml53wdnr000001sqd6ol4n35";

export function TripReviewMap({ tripId }: { tripId: string }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    const token = mapboxService.getAccessToken();
    if (!token || !mapContainer.current) return;

    let map: mapboxgl.Map;

    import("mapbox-gl").then((mapboxgl) => {
      mapboxgl.default.accessToken = token;
      map = new mapboxgl.default.Map({
        container: mapContainer.current!,
        style: MAP_STYLE,
        center: [136.6, 35.5], // Center of Japan
        zoom: 5,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.default.NavigationControl(), "top-right");
      mapRef.current = map;
    });

    return () => {
      map?.remove();
      mapRef.current = null;
    };
  }, [tripId]);

  if (!mapboxService.isEnabled()) return null;

  return (
    <div>
      <h2 className="font-serif italic text-xl text-foreground">Your Route</h2>
      <div
        ref={mapContainer}
        className="mt-4 h-[300px] w-full overflow-hidden rounded-xl border border-border sm:h-[400px]"
      />
    </div>
  );
}
