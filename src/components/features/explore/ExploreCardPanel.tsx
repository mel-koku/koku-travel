"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExploreCompactCard } from "./ExploreCompactCard";
import type { Location } from "@/types/location";

const PAGE_SIZE = 40;

type ExploreCardPanelProps = {
  locations: Location[];
  totalCount: number;
  hasBoundsFilter: boolean;
  onSelectLocation: (location: Location) => void;
  highlightedLocationId: string | null;
  onHoverChange: (locationId: string | null) => void;
  isLoading?: boolean;
};

export function ExploreCardPanel({
  locations,
  totalCount,
  hasBoundsFilter,
  onSelectLocation,
  highlightedLocationId,
  onHoverChange,
  isLoading,
}: ExploreCardPanelProps) {
  const [page, setPage] = useState(1);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset page when locations change (e.g. map panned)
  useEffect(() => {
    setPage(1);
  }, [locations]);

  const visibleLocations = useMemo(
    () => locations.slice(0, page * PAGE_SIZE),
    [locations, page],
  );

  const hasMore = visibleLocations.length < locations.length;

  // IntersectionObserver for internal pagination
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPage((prev) => prev + 1);
        }
      },
      { rootMargin: "0px 0px 200% 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, visibleLocations.length]);

  // Auto-scroll to highlighted card from map hover
  useEffect(() => {
    if (!highlightedLocationId || !scrollContainerRef.current) return;

    const card = scrollContainerRef.current.querySelector(
      `[data-location-id="${highlightedLocationId}"]`,
    );
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [highlightedLocationId]);

  const countLabel = hasBoundsFilter
    ? `${locations.length.toLocaleString()} of ${totalCount.toLocaleString()} places in view`
    : `${totalCount.toLocaleString()} places`;

  return (
    <div ref={scrollContainerRef} className="flex flex-col">
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 lg:px-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-xl shimmer" />
          ))}
        </div>
      ) : locations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <p className="font-serif italic text-lg text-stone text-center">
            Pan the map to find places
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 lg:px-0">
            {visibleLocations.map((location) => (
              <ExploreCompactCard
                key={location.id}
                location={location}
                onSelect={onSelectLocation}
                isHighlighted={highlightedLocationId === location.id}
                onHover={onHoverChange}
              />
            ))}
          </div>

          {/* Pagination sentinel */}
          {hasMore && (
            <div ref={sentinelRef} className="py-6 flex justify-center">
              <div className="h-[2px] w-32 bg-brand-primary/30 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-brand-primary rounded-full animate-pulse" />
              </div>
            </div>
          )}

          {/* End state */}
          {!hasMore && visibleLocations.length > 0 && (
            <div className="py-8 text-center">
              <p className="text-xs text-stone">
                {visibleLocations.length.toLocaleString()} places shown
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
