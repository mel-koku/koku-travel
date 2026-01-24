"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef, useState, useCallback, useEffect } from "react";
import type { Location } from "@/types/location";
import { useLocationDetailsQuery } from "@/hooks/useLocationDetailsQuery";
import { getLocationDisplayName } from "@/lib/locationNameUtils";

const LocationDetailsModal = dynamic(
  () => import("./LocationDetailsModal").then((m) => ({ default: m.LocationDetailsModal })),
  { ssr: false }
);

type FeaturedCarouselProps = {
  locations: Location[];
};

export function FeaturedCarousel({ locations }: FeaturedCarouselProps) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    updateScrollButtons();
    scrollEl.addEventListener("scroll", updateScrollButtons);
    window.addEventListener("resize", updateScrollButtons);

    return () => {
      scrollEl.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [updateScrollButtons]);

  const scroll = useCallback((direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const cardWidth = 276; // 260px card + 16px gap
    const scrollAmount = cardWidth * 2;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }, []);

  if (locations.length === 0) return null;

  return (
    <section aria-label="Featured destinations">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Featured Destinations</h2>
          <p className="text-sm text-gray-500">Top-rated places loved by travelers</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 transition hover:border-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:bg-white"
            aria-label="Scroll left"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 transition hover:border-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:bg-white"
            aria-label="Scroll right"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {locations.map((location) => (
          <FeaturedCard key={location.id} location={location} onSelect={setSelectedLocation} />
        ))}
      </div>

      {/* Location Details Modal */}
      <LocationDetailsModal
        location={selectedLocation}
        onClose={() => setSelectedLocation(null)}
      />
    </section>
  );
}

type FeaturedCardProps = {
  location: Location;
  onSelect?: (location: Location) => void;
};

function FeaturedCard({ location, onSelect }: FeaturedCardProps) {
  const { details } = useLocationDetailsQuery(location.id);
  const displayName = getLocationDisplayName(details?.displayName ?? null, location);
  const imageSrc = location.primaryPhotoUrl ?? location.image;
  const rating = location.rating ?? 0;
  const reviewCount = location.reviewCount ?? 0;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(location)}
      className="flex-none w-[260px] snap-start rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
    >
      {/* Image with rating badge */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
        <Image
          src={imageSrc || FALLBACK_IMAGE}
          alt={displayName}
          fill
          className="object-cover"
          sizes="260px"
        />
        {/* Rating badge */}
        {rating > 0 && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm">
            <StarIcon />
            <span className="text-sm font-medium text-gray-900">{rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-1">
        <h3 className="font-medium text-gray-900 line-clamp-1">{displayName}</h3>
        <p className="text-sm text-gray-500 line-clamp-1">
          {location.city}, {location.region}
        </p>
        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-xs text-gray-700 font-medium capitalize">{location.category}</span>
          {reviewCount > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-500">{formatReviewCount(reviewCount)} reviews</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function formatReviewCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

function StarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5 text-amber-500"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
    </svg>
  );
}
