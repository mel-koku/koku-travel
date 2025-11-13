"use client";

import { useState } from "react";

import { Location } from "@/types/location";

import { LocationCard } from "./LocationCard";
import { LocationDetailsModal } from "./LocationDetailsModal";

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
      <section aria-live="polite" className="mt-8">
        <div
          className={`grid grid-cols-1 gap-6 sm:grid-cols-2 ${
            layout === "sidebar"
              ? "lg:grid-cols-3"
              : "lg:grid-cols-3 xl:grid-cols-4"
          }`}
        >
          {locations.length === 0 && (
            <p className="col-span-full text-center text-gray-500 py-16">
              No locations match your search.
            </p>
          )}

          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              onSelect={setSelectedLocation}
            />
          ))}

          {hasMore && (
            <div className="col-span-full mt-6 flex justify-center pb-4">
              <button
                type="button"
                onClick={onLoadMore}
                className="rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Load more places
              </button>
            </div>
          )}
        </div>
      </section>

      <LocationDetailsModal location={selectedLocation} onClose={handleClose} />
    </>
  );
}

