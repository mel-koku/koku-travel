"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { featureFlags } from "@/lib/env/featureFlags";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { useNearbyLocationsQuery } from "@/hooks/useLocationsQuery";
import type { Location } from "@/types/location";

const DiscoverMap = dynamic(
  () => import("./DiscoverMap").then((m) => ({ default: m.DiscoverMap })),
  { ssr: false },
);

const LocationExpanded = dynamic(
  () =>
    import("../places/LocationExpanded").then((m) => ({
      default: m.LocationExpanded,
    })),
  { ssr: false },
);

const CATEGORY_CHIPS = [
  { id: "", label: "All" },
  { id: "restaurant", label: "Food" },
  { id: "culture", label: "Culture" },
  { id: "nature", label: "Nature" },
  { id: "bar", label: "Nightlife" },
  { id: "shopping", label: "Shopping" },
] as const;

const FALLBACK_POSITION = { lat: 35.6812, lng: 139.7671 }; // Tokyo Station

export function DiscoverShell() {
  const geoLocation = useCurrentLocation();
  const [discoverCategory, setDiscoverCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [expandedLocation, setExpandedLocation] = useState<Location | null>(
    null,
  );
  const [highlightedLocationId, setHighlightedLocationId] = useState<
    string | null
  >(null);

  // Auto-request geolocation on mount
  useEffect(() => {
    geoLocation.request();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usingFallback =
    !geoLocation.isLoading &&
    geoLocation.error !== null &&
    !geoLocation.position;
  const userLat =
    geoLocation.position?.lat ?? (usingFallback ? FALLBACK_POSITION.lat : null);
  const userLng =
    geoLocation.position?.lng ?? (usingFallback ? FALLBACK_POSITION.lng : null);

  const userPosition = useMemo(
    () => (userLat !== null && userLng !== null ? { lat: userLat, lng: userLng } : null),
    [userLat, userLng],
  );

  const {
    data: nearbyData,
    isLoading: isNearbyLoading,
  } = useNearbyLocationsQuery(userLat, userLng, {
    category: discoverCategory || undefined,
    openNow: true,
    radius: usingFallback ? 5 : 1.5,
    limit: 20,
  });

  const nearbyLocations = useMemo(() => {
    const data = nearbyData?.data ?? [];
    if (!searchQuery.trim()) return data;
    const q = searchQuery.trim().toLowerCase();
    return data.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        loc.category?.toLowerCase().includes(q) ||
        loc.cuisineType?.toLowerCase().includes(q),
    );
  }, [nearbyData, searchQuery]);

  const handleLocationClick = useCallback((location: Location) => {
    setExpandedLocation(location);
    setHighlightedLocationId(location.id);
  }, []);

  const handleCloseExpanded = useCallback(() => {
    setExpandedLocation(null);
    setHighlightedLocationId(null);
  }, []);

  const handleSurpriseMe = useCallback(() => {
    if (nearbyLocations.length === 0) return;
    const pick =
      nearbyLocations[Math.floor(Math.random() * nearbyLocations.length)];
    if (pick) {
      setExpandedLocation(pick);
      setHighlightedLocationId(pick.id);
    }
  }, [nearbyLocations]);

  const mapAvailable = useMemo(
    () => featureFlags.enableMapbox && !featureFlags.cheapMode,
    [],
  );

  const isLocating = geoLocation.isLoading || (userPosition === null && !usingFallback);

  return (
    <div className="relative h-[calc(100dvh-5rem)] w-full bg-background">
      {/* Map or fallback */}
      {mapAvailable ? (
        <DiscoverMap
          locations={nearbyLocations}
          userPosition={userPosition}
          onLocationClick={handleLocationClick}
          highlightedLocationId={highlightedLocationId}
          isLoading={isNearbyLoading}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <p className="text-sm text-foreground-secondary">
            Map requires a Mapbox token to display nearby locations.
          </p>
        </div>
      )}

      {/* Geolocation loading overlay */}
      {isLocating && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-sage border-t-transparent animate-spin" />
            <p className="text-sm text-stone">Locating you...</p>
          </div>
        </div>
      )}

      {/* Floating search + category chips */}
      <div className="absolute left-1/2 -translate-x-1/2 top-3 z-10 max-w-[calc(100%-4.5rem)]">
        <div className="inline-flex items-center gap-2 rounded-xl bg-[#1f1a14]/90 backdrop-blur-md px-2.5 py-2 shadow-lg">
          {/* Search input */}
          <div className="relative shrink-0">
            <svg
              className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-24 focus:w-36 rounded-lg bg-white/10 pl-7 pr-2 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:bg-white/15 focus:ring-1 focus:ring-white/20 transition-all"
            />
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-white/20 shrink-0" />

          {/* Open now indicator */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3da193] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3da193]" />
          </span>
          <span className="text-[10px] text-[#3da193] font-medium whitespace-nowrap mr-0.5">
            Open now
          </span>

          {/* Divider */}
          <div className="h-4 w-px bg-white/20 shrink-0" />

          {/* Category chips */}
          {CATEGORY_CHIPS.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setDiscoverCategory(chip.id)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition whitespace-nowrap ${
                discoverCategory === chip.id
                  ? "bg-[#c4504f] text-white"
                  : "bg-white/10 text-white/80 border border-white/10 hover:bg-white/20"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fallback banner */}
      {usingFallback && !isLocating && (
        <div className="absolute bottom-20 left-3 right-3 z-10">
          <div className="mx-auto max-w-sm rounded-xl border border-white/10 bg-[#1f1a14]/90 backdrop-blur-md px-4 py-3 flex items-start gap-2.5 shadow-lg">
            <svg
              className="h-4 w-4 text-[#d4b83d] shrink-0 mt-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="text-xs text-white">
                Showing places near Tokyo Station.
              </p>
              <p className="text-[10px] text-white/60 mt-0.5">
                Enable location access to discover places near you.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Surprise Me FAB */}
      {nearbyLocations.length > 0 && !isLocating && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pb-[env(safe-area-inset-bottom)]">
          <button
            onClick={handleSurpriseMe}
            className="flex items-center gap-2 rounded-full bg-[#1f1a14]/90 backdrop-blur-md px-5 py-3 text-sm font-semibold text-white shadow-xl hover:bg-[#1f1a14] active:scale-[0.97] transition"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
              <circle cx="15.5" cy="8.5" r="1" fill="currentColor" />
              <circle cx="12" cy="12" r="1" fill="currentColor" />
              <circle cx="8.5" cy="15.5" r="1" fill="currentColor" />
              <circle cx="15.5" cy="15.5" r="1" fill="currentColor" />
            </svg>
            Surprise Me
          </button>
        </div>
      )}

      {/* Location detail panel */}
      {expandedLocation && (
        <LocationExpanded
          location={expandedLocation}
          onClose={handleCloseExpanded}
        />
      )}
    </div>
  );
}
