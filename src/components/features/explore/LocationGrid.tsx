"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";

import { Location } from "@/types/location";

import { LocationCard } from "./LocationCard";
import { LocationExpanded } from "./LocationExpanded";

const LocationDetailsModal = dynamic(
  () => import("./LocationDetailsModal").then((m) => ({ default: m.LocationDetailsModal })),
  { ssr: false }
);

type LocationGridProps = {
  locations: Location[];
  hasMore: boolean;
  onLoadMore: () => void;
  layout?: "default" | "sidebar";
};

export function LocationGrid({
  locations,
  hasMore,
  onLoadMore,
  layout = "default",
}: LocationGridProps) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [expandedLocation, setExpandedLocation] = useState<Location | null>(null);

  const handleClose = () => setSelectedLocation(null);
  const handleExpand = (location: Location) => setExpandedLocation(location);
  const handleCollapseExpanded = () => setExpandedLocation(null);

  return (
    <>
      <section aria-live="polite">
        {locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface">
              <svg className="h-8 w-8 text-stone" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-base font-medium text-charcoal mb-1">No places found</p>
            <p className="text-sm text-stone text-center max-w-sm">
              Try adjusting your filters or search to find what you&apos;re looking for.
            </p>
          </div>
        ) : (
          <>
            {/* Masonry-style grid with varied span values */}
            <div
              className={`grid gap-x-5 gap-y-8 sm:gap-x-6 sm:gap-y-10 ${
                layout === "sidebar"
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              }`}
              style={{
                gridAutoFlow: layout === "default" ? "dense" : undefined,
              }}
            >
              {locations.map((location, index) => {
                // Every 5th card is double-height for masonry effect
                const isDoubleHeight = layout === "default" && index % 5 === 0 && index > 0;

                return (
                  <div
                    key={location.id}
                    className={isDoubleHeight ? "sm:row-span-2" : ""}
                  >
                    <LocationCard
                      location={location}
                      onSelect={handleExpand}
                      variant={isDoubleHeight ? "tall" : "default"}
                    />
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="mt-12 flex justify-center pb-8">
                <button
                  type="button"
                  onClick={onLoadMore}
                  className="group/btn flex items-center gap-2 rounded-full bg-brand-primary px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-brand-primary/90 hover:shadow-md hover:px-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 active:scale-[0.98]"
                >
                  <span>Show more</span>
                  <svg
                    className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-y-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* In-page card expansion */}
      <AnimatePresence>
        {expandedLocation && (
          <LocationExpanded
            location={expandedLocation}
            onClose={handleCollapseExpanded}
          />
        )}
      </AnimatePresence>

      {/* Fallback modal for programmatic use */}
      <LocationDetailsModal location={selectedLocation} onClose={handleClose} />
    </>
  );
}
