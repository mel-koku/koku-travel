import Image from "next/image";
import Link from "next/link";

import type { Location } from "@/types/location";

type FeaturedLocationsProps = {
  locations: Location[];
};

export function FeaturedLocations({ locations }: FeaturedLocationsProps) {
  if (locations.length === 0) {
    return null;
  }

  return (
    <section className="bg-neutral-surface py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section Header */}
        <div className="mb-16 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-earthy-sage">
              Staff Picks
            </p>
            <h2 className="mt-4 font-serif text-4xl font-medium text-earthy-charcoal sm:text-5xl">
              Worth your time
            </h2>
          </div>
          <Link
            href="/explore"
            className="group flex items-center gap-2 text-earthy-charcoal transition-colors hover:text-earthy-sage"
          >
            <span className="text-sm font-medium uppercase tracking-wider">
              View all locations
            </span>
            <ArrowRightIcon />
          </Link>
        </div>

        {/* Location Grid - Masonry-style */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {locations.slice(0, 8).map((location, index) => (
            <FeaturedLocationCard
              key={location.id}
              location={location}
              featured={index === 0 || index === 5}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedLocationCard({
  location,
  featured = false,
}: {
  location: Location;
  featured?: boolean;
}) {
  const imageSrc = location.primaryPhotoUrl ?? location.image;

  return (
    <Link
      href={`/explore?location=${location.id}`}
      className={`group relative block overflow-hidden rounded-xl ${
        featured ? "sm:col-span-2 sm:row-span-2" : ""
      }`}
    >
      <div className={`relative ${featured ? "aspect-square" : "aspect-[3/4]"}`}>
        <Image
          src={imageSrc || "/placeholder.jpg"}
          alt={location.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes={featured ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Content */}
        <div className="absolute inset-x-0 bottom-0 p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-white/70">
            {location.city}
          </p>
          <h3 className={`mt-1 font-serif text-white ${featured ? "text-2xl" : "text-xl"}`}>
            {location.name}
          </h3>
          {location.rating && (
            <div className="mt-2 flex items-center gap-1.5 text-white/80">
              <StarIcon />
              <span className="text-sm">{location.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function StarIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      className="h-4 w-4 transition-transform group-hover:translate-x-1"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}
