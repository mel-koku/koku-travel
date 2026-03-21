"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PlacesCardC } from "./PlacesCardC";
import { cEase } from "@c/ui/motionC";
import type { Location } from "@/types/location";

const PAGE_SIZE = 40;

type PlacesGridCProps = {
  locations: Location[];
  totalCount?: number;
  isLoading?: boolean;
  onClearFilters?: () => void;
  onSelectLocation?: (location: Location) => void;
};

export function PlacesGridC({ locations, isLoading, onClearFilters, onSelectLocation }: PlacesGridCProps) {
  const [page, setPage] = useState(1);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

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

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="bg-[var(--border)]" style={{ lineHeight: 0 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-[var(--background)]">
                <div className="aspect-[4/3] bg-[var(--border)] animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-2.5 w-20 bg-[var(--border)]" />
                  <div className="h-4 w-3/4 bg-[var(--border)]" />
                  <div className="h-3 w-full bg-[var(--border)]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-base font-medium text-[var(--muted-foreground)] text-center">
            No results for those filters.
          </p>
          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-4 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--primary)] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
      {/* gap-px border-box grid */}
      <div className="bg-[var(--border)]" style={{ lineHeight: 0 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px">
          {visibleLocations.map((location, i) => (
            <motion.div
              key={location.id}
              initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: prefersReducedMotion ? 0 : (i % 3) * 0.05, ease: cEase }}
            >
              <PlacesCardC
                location={location}
                onSelect={onSelectLocation}
                eager={i < 6}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="py-6 flex justify-center">
          <div className="h-[2px] w-32 bg-[var(--primary)]/20 overflow-hidden">
            <div className="h-full w-1/3 bg-[var(--primary)] animate-pulse" />
          </div>
        </div>
      )}

      {!hasMore && visibleLocations.length > 0 && (
        <div className="py-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            {visibleLocations.length.toLocaleString()} places shown
          </p>
        </div>
      )}
    </div>
  );
}
