"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { featureFlags } from "@/lib/env/featureFlags";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { useNearbyLocationsQuery } from "@/hooks/useLocationsQuery";
import type { NearbyLocation } from "@/hooks/useLocationsQuery";
import type { Location } from "@/types/location";
import { DiscoverMapCardB } from "./DiscoverMapCardB";

const DiscoverMapB = dynamic(
  () => import("@b/features/discover/DiscoverMapB").then((m) => ({ default: m.DiscoverMapB })),
  { ssr: false },
);

const PlaceDetailPanelB = dynamic(
  () => import("@b/features/places/PlaceDetailPanelB").then((m) => ({ default: m.PlaceDetailPanelB })),
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

const FALLBACK_POSITION = { lat: 35.6812, lng: 139.7671 };

export function DiscoverShellB() {
  const geoLocation = useCurrentLocation();
  const [discoverCategory, setDiscoverCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [highlightedLocationId, setHighlightedLocationId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const hoverSourceRef = useRef<"card" | "map" | null>(null);
  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    geoLocation.request();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usingFallback = !geoLocation.isLoading && geoLocation.error !== null && !geoLocation.position;
  const userLat = geoLocation.position?.lat ?? (usingFallback ? FALLBACK_POSITION.lat : null);
  const userLng = geoLocation.position?.lng ?? (usingFallback ? FALLBACK_POSITION.lng : null);

  const userPosition = useMemo(
    () => (userLat !== null && userLng !== null ? { lat: userLat, lng: userLng } : null),
    [userLat, userLng],
  );

  const { data: nearbyData, isLoading: isNearbyLoading } = useNearbyLocationsQuery(userLat, userLng, {
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

  const handleMapLocationClick = useCallback((location: Location) => {
    setSelectedLocation(location);
  }, []);

  const handleCardSelect = useCallback((location: NearbyLocation) => {
    setSelectedLocation(location);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedLocation(null);
  }, []);

  const handleCardHover = useCallback((locationId: string | null) => {
    hoverSourceRef.current = locationId ? "card" : null;
    setHighlightedLocationId(locationId);
  }, []);

  const handleMapHover = useCallback((locationId: string | null) => {
    hoverSourceRef.current = locationId ? "map" : null;
    setHighlightedLocationId(locationId);
  }, []);

  // Auto-scroll pill card when map pin hovered
  useEffect(() => {
    if (!highlightedLocationId || hoverSourceRef.current !== "map") return;
    const el = cardRefsMap.current.get(highlightedLocationId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [highlightedLocationId]);

  const setCardRef = useCallback(
    (locationId: string) => (el: HTMLDivElement | null) => {
      if (el) cardRefsMap.current.set(locationId, el);
      else cardRefsMap.current.delete(locationId);
    },
    [],
  );

  const mapAvailable = useMemo(() => featureFlags.enableMapbox && !featureFlags.cheapMode, []);
  const isLocating = geoLocation.isLoading || (userPosition === null && !usingFallback);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[var(--background)]" style={{ isolation: "isolate" }}>
      {/* Map or fallback */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {mapAvailable ? (
          <DiscoverMapB
            locations={nearbyLocations}
            userPosition={userPosition}
            onLocationClick={handleMapLocationClick}
            onHoverChange={handleMapHover}
            highlightedLocationId={highlightedLocationId}
            isLoading={isNearbyLoading}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              Map requires a Mapbox token to display nearby locations.
            </p>
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isLocating && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
            <p className="text-sm text-[var(--muted-foreground)]">Locating you...</p>
          </div>
        </div>
      )}

      {/* Floating search + category chips */}
      <div
        className="fixed inset-x-0 flex justify-center px-6"
        style={{ zIndex: 40, top: "calc(var(--header-h) + 12px)" }}
      >
        <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-2.5 py-2" style={{ boxShadow: "var(--shadow-elevated)" }}>
          {/* Search */}
          <div className="relative shrink-0">
            <svg
              className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted-foreground)] pointer-events-none"
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
              className="w-24 focus:w-36 rounded-lg bg-[var(--surface)] pl-7 pr-2 py-1.5 text-base sm:text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-all"
            />
          </div>

          <div className="h-4 w-px bg-[var(--border)] shrink-0" />

          {/* Open now */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
          </span>
          <span className="text-[10px] text-[var(--success)] font-medium whitespace-nowrap mr-0.5">
            Open now
          </span>

          <div className="h-4 w-px bg-[var(--border)] shrink-0" />

          {/* Category chips */}
          {CATEGORY_CHIPS.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setDiscoverCategory(chip.id)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition whitespace-nowrap ${
                discoverCategory === chip.id
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--surface)] text-[var(--foreground-body)] hover:bg-[var(--border)]"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Floating pill column — left side, vertical scroll (Places-style) */}
      {nearbyLocations.length > 0 && (
        <div
          className="absolute top-14 left-3 bottom-3 z-10 flex w-56 flex-col pointer-events-none"
        >
          {/* Count */}
          <div className="mb-1.5 pointer-events-auto">
            <span
              className="inline-block rounded-lg bg-white px-2 py-1 text-[11px] font-medium text-[var(--muted-foreground)]"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
              {nearbyLocations.length} {nearbyLocations.length === 1 ? "place" : "places"} nearby
            </span>
          </div>

          {/* Scrollable pills */}
          <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide space-y-1.5 pointer-events-auto" data-lenis-prevent>
            {nearbyLocations.map((location) => (
              <DiscoverMapCardB
                key={location.id}
                ref={setCardRef(location.id)}
                location={location}
                isHighlighted={highlightedLocationId === location.id}
                onHover={handleCardHover}
                onSelect={handleCardSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Fallback banner */}
      {usingFallback && !isLocating && (
        <div className="absolute bottom-4 left-3 right-3 z-10">
          <div
            className="mx-auto max-w-sm rounded-2xl bg-white px-4 py-3 flex items-start gap-2.5"
            style={{ boxShadow: "var(--shadow-elevated)" }}
          >
            <svg
              className="h-4 w-4 text-[var(--warning)] shrink-0 mt-0.5"
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
              <p className="text-xs text-[var(--foreground)]">
                Showing places near Tokyo Station.
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                Enable location access to discover places near you.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detail panel slide-in */}
      <AnimatePresence>
        {selectedLocation && (
          <PlaceDetailPanelB
            key={selectedLocation.id}
            location={selectedLocation}
            onClose={handleCloseDetail}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
