"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GEOLOCATION_STORAGE_KEY } from "@/lib/constants/storage";
import { getSession, setSession, removeSession } from "@/lib/storageHelpers";

export type GeoPosition = {
  lat: number;
  lng: number;
  accuracy: number;
};

type CurrentLocationState = {
  position: GeoPosition | null;
  error: string | null;
  isLoading: boolean;
  isSupported: boolean;
  request: () => void;
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

type CachedGeo = { position: GeoPosition; cachedAt: number };

function getCached(): GeoPosition | null {
  const cached = getSession<CachedGeo>(GEOLOCATION_STORAGE_KEY);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > CACHE_TTL) {
    removeSession(GEOLOCATION_STORAGE_KEY);
    return null;
  }
  return cached.position;
}

function setCache(position: GeoPosition) {
  setSession<CachedGeo>(GEOLOCATION_STORAGE_KEY, { position, cachedAt: Date.now() });
}

/**
 * Hook for accessing browser geolocation with caching.
 * Does NOT auto-request on mount — call `request()` to prompt the user.
 */
export function useCurrentLocation(): CurrentLocationState {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const watchId = useRef<number | null>(null);

  const isSupported =
    typeof window !== "undefined" && "geolocation" in navigator;

  // Check cache on mount
  useEffect(() => {
    const cached = getCached();
    if (cached) setPosition(cached);
  }, []);

  const request = useCallback(() => {
    if (!isSupported) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    // Use cache if fresh
    const cached = getCached();
    if (cached) {
      setPosition(cached);
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (geo) => {
        const pos: GeoPosition = {
          lat: geo.coords.latitude,
          lng: geo.coords.longitude,
          accuracy: geo.coords.accuracy,
        };
        setPosition(pos);
        setCache(pos);
        setIsLoading(false);
      },
      (err) => {
        setIsLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Location permission denied.");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("Location unavailable.");
            break;
          case err.TIMEOUT:
            setError("Location request timed out.");
            break;
          default:
            setError("Could not get your location.");
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: CACHE_TTL },
    );
  }, [isSupported]);

  // Cleanup watch on unmount
  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  return { position, error, isLoading, isSupported, request };
}
