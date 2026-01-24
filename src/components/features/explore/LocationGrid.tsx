"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Location } from "@/types/location";

import { LocationCard } from "./LocationCard";

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

  const handleClose = () => setSelectedLocation(null);

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
            <div
              className={`grid gap-x-6 gap-y-10 ${
                layout === "sidebar"
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              }`}
            >
              {locations.map((location) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  onSelect={setSelectedLocation}
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-12 flex justify-center pb-8">
                <button
                  type="button"
                  onClick={onLoadMore}
                  className="rounded-full bg-brand-primary px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary/90 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                >
                  Show more
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <LocationDetailsModal location={selectedLocation} onClose={handleClose} />
    </>
  );
}

