"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PlacesCardB } from "./PlacesCardB";
import type { Location } from "@/types/location";

const PAGE_SIZE = 40;

type PlacesCardPanelBProps = {
  locations: Location[];
  totalCount: number;
  hasBoundsFilter: boolean;
  highlightedLocationId: string | null;
  onHoverChange: (locationId: string | null) => void;
  isLoading?: boolean;
};

export function PlacesCardPanelB({
  locations,
  totalCount,
  hasBoundsFilter,
  highlightedLocationId,
  onHoverChange,
  isLoading,
}: PlacesCardPanelBProps) {
  const [page, setPage] = useState(1);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setPage(1); }, [locations]);

  const visibleLocations = useMemo(
    () => locations.slice(0, page * PAGE_SIZE),
    [locations, page],
  );

  const hasMore = visibleLocations.length < locations.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setPage((prev) => prev + 1);
      },
      { rootMargin: "0px 0px 200% 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, visibleLocations.length]);

  useEffect(() => {
    if (!highlightedLocationId || !scrollContainerRef.current) return;
    const card = scrollContainerRef.current.querySelector(
      `[data-location-id="${highlightedLocationId}"]`,
    );
    if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [highlightedLocationId]);

  return (
    <div ref={scrollContainerRef} className="flex flex-col">
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 lg:px-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-[var(--surface)] animate-pulse" />
          ))}
        </div>
      ) : locations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <p className="text-base font-medium text-[var(--muted-foreground)] text-center">
            Pan the map to find places
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 lg:px-0">
            {visibleLocations.map((location, i) => (
              <PlacesCardB
                key={location.id}
                location={location}
                isHighlighted={highlightedLocationId === location.id}
                onHover={onHoverChange}
                eager={i < 4}
              />
            ))}
          </div>

          {hasMore && (
            <div ref={sentinelRef} className="py-6 flex justify-center">
              <div className="h-[2px] w-32 bg-[var(--primary)]/30 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-[var(--primary)] rounded-full animate-pulse" />
              </div>
            </div>
          )}

          {hasBoundsFilter && locations.length <= 10 && locations.length < totalCount && (
            <div className="py-6 text-center">
              <p className="text-xs text-[var(--muted-foreground)]">Zoom out to see more places</p>
            </div>
          )}

          {!hasMore && visibleLocations.length > 0 && (
            <div className="py-8 text-center">
              <p className="text-xs text-[var(--muted-foreground)]">
                {visibleLocations.length.toLocaleString()} places shown
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
