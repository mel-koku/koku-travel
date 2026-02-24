"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PlacesCardB } from "./PlacesCardB";
import type { Location } from "@/types/location";

const PAGE_SIZE = 40;
const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

type PlacesGridBProps = {
  locations: Location[];
  totalCount?: number;
  isLoading?: boolean;
  onClearFilters?: () => void;
};

export function PlacesGridB({ locations, isLoading, onClearFilters }: PlacesGridBProps) {
  const [page, setPage] = useState(1);
  const sentinelRef = useRef<HTMLDivElement>(null);

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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-[var(--surface)] animate-pulse">
              <div className="aspect-[4/3]" />
              <div className="p-3.5 space-y-2">
                <div className="h-4 w-3/4 rounded bg-[var(--border)]" />
                <div className="h-3 w-1/2 rounded bg-[var(--border)]" />
                <div className="h-3 w-full rounded bg-[var(--border)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-base font-medium text-[var(--muted-foreground)] text-center">
            Nothing here for those filters.
          </p>
          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-4 text-sm font-medium text-[var(--primary)] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleLocations.map((location, i) => (
          <motion.div
            key={location.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.04, ease: bEase }}
          >
            <PlacesCardB
              location={location}
              eager={i < 6}
            />
          </motion.div>
        ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="py-6 flex justify-center">
          <div className="h-[2px] w-32 bg-[var(--primary)]/30 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-[var(--primary)] rounded-full animate-pulse" />
          </div>
        </div>
      )}

      {!hasMore && visibleLocations.length > 0 && (
        <div className="py-8 text-center">
          <p className="text-xs text-[var(--muted-foreground)]">
            {visibleLocations.length.toLocaleString()} places shown
          </p>
        </div>
      )}
    </div>
  );
}
