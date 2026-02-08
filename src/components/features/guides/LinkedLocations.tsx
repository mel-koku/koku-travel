"use client";

import Image from "next/image";
import Link from "next/link";

import { resizePhotoUrl } from "@/lib/google/transformations";
import type { Location } from "@/types/location";

type LinkedLocationsProps = {
  locations: Location[];
};

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export function LinkedLocations({ locations }: LinkedLocationsProps) {
  if (locations.length === 0) {
    return null;
  }

  return (
    <section className="mt-12">
      <h2 className="font-serif text-xl font-semibold text-foreground mb-4">
        Featured Places
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((location) => (
          <LocationMiniCard key={location.id} location={location} />
        ))}
      </div>
    </section>
  );
}

function LocationMiniCard({ location }: { location: Location }) {
  const imageSrc = resizePhotoUrl(location.primaryPhotoUrl || location.image, 400) || FALLBACK_IMAGE;

  return (
    <Link
      href={`/explore?location=${location.id}`}
      className="group flex gap-3 rounded-lg border border-border bg-background p-3 transition-all hover:shadow-md hover:border-border"
    >
      {/* Image */}
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-surface">
        <Image
          src={imageSrc}
          alt={location.name}
          fill
          unoptimized
          className="object-cover transition-transform group-hover:scale-105"
          sizes="80px"
        />
      </div>

      {/* Content */}
      <div className="flex flex-col justify-center min-w-0">
        <h3 className="font-medium text-foreground line-clamp-1 group-hover:text-brand-primary transition-colors">
          {location.name}
        </h3>
        <p className="text-sm text-stone line-clamp-1">
          {location.city}
          {location.region && location.city !== location.region && `, ${location.region}`}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-medium capitalize bg-sand/50 text-foreground-secondary px-2 py-0.5 rounded-xl">
            {location.category}
          </span>
          {location.estimatedDuration && (
            <span className="text-xs text-stone">
              {location.estimatedDuration}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
