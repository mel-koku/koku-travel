import { Location } from "@/types/location";

import { LocationCard } from "./LocationCard";

type LocationGridProps = {
  locations: Location[];
};

export function LocationGrid({ locations }: LocationGridProps) {
  return (
    <section aria-live="polite" className="mt-8">
      <div className="min-h-[60vh] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {locations.length === 0 && (
          <p className="col-span-full text-center text-gray-500 py-16">
            No locations match your search.
          </p>
        )}

        {locations.map((location) => (
          <LocationCard key={location.id} location={location} />
        ))}
      </div>
    </section>
  );
}

