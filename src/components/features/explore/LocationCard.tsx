"use client";

import Image from "next/image";
import { memo, useRef } from "react";

import { useWishlist } from "@/context/WishlistContext";
import { LOCATION_EDITORIAL_SUMMARIES } from "@/data/locationEditorialSummaries";
import { useLocationDetailsQuery } from "@/hooks/useLocationDetailsQuery";
import type { Location } from "@/types/location";
import { getLocationDisplayName } from "@/lib/locationNameUtils";

type LocationCardProps = {
  location: Location;
  onSelect?: (location: Location) => void;
};

export const LocationCard = memo(function LocationCard({ location, onSelect }: LocationCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const active = isInWishlist(location.id);
  const { details } = useLocationDetailsQuery(location.id);
  const displayName = getLocationDisplayName(details?.displayName ?? null, location);
  const summary = getShortOverview(location, details?.editorialSummary ?? null);
  const estimatedDuration = location.estimatedDuration?.trim();
  const rating = getLocationRating(location);
  const reviewCount = getLocationReviewCount(location);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  // Use primary photo URL from database if available, otherwise fall back to image field
  const imageSrc = location.primaryPhotoUrl ?? location.image;

  return (
    <article className="group relative text-gray-900">
      {/* Wishlist button */}
      <button
        aria-label={active ? "Remove from Trip" : "Add to Trip"}
        onClick={(event) => {
          event.stopPropagation();
          toggleWishlist(location.id);
        }}
        className={`absolute top-3 right-3 z-10 rounded-full p-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
          active ? "text-red-500" : "text-white drop-shadow-md hover:text-red-400"
        }`}
      >
        <HeartIcon active={active} />
      </button>

      {/* Main clickable area */}
      <button
        type="button"
        onClick={() => onSelect?.(location)}
        ref={buttonRef}
        className="block w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 rounded-xl"
      >
        {/* Image */}
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
          <Image
            src={imageSrc || FALLBACK_IMAGE_SRC}
            alt={displayName}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(min-width:1280px) 25vw, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
            priority={false}
          />
        </div>

        {/* Content */}
        <div className="mt-3 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-gray-900 line-clamp-1">{displayName}</h3>
            {rating ? (
              <div className="flex shrink-0 items-center gap-1 text-sm">
                <StarIcon />
                <span className="text-gray-900">{rating.toFixed(1)}</span>
                {reviewCount ? (
                  <span className="text-gray-500">({formatReviewCount(reviewCount)})</span>
                ) : null}
              </div>
            ) : null}
          </div>

          <p className="text-sm text-gray-500">
            {location.city}, {location.region}
          </p>

          <p className="text-sm text-gray-500 line-clamp-2">{summary}</p>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm text-gray-900 font-medium capitalize">
              {location.category}
            </span>
            {estimatedDuration ? (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-sm text-gray-500">
                  {estimatedDuration}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </button>
    </article>
  );
});

export function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-6 w-6 transition-colors ${active ? "fill-red-500 stroke-red-500" : "fill-black/50 stroke-white"}`}
      viewBox="0 0 24 24"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19.5 13.572a24.064 24.064 0 0 1-7.5 7.178 24.064 24.064 0 0 1-7.5-7.178C3.862 12.334 3 10.478 3 8.52 3 5.989 5.014 4 7.5 4c1.54 0 2.994.757 4 1.955C12.506 4.757 13.96 4 15.5 4 17.986 4 20 5.989 20 8.52c0 1.958-.862 3.813-2.5 5.052Z" />
    </svg>
  );
}

const CATEGORY_DESCRIPTORS: Record<string, string> = {
  culture: "Historic cultural landmark",
  food: "Favorite spot for local flavors",
  nature: "Outdoor escape with scenic views",
  shopping: "Bustling shopping stop",
  view: "Panoramic viewpoint worth the stop",
};

const FALLBACK_IMAGE_SRC =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function getShortOverview(location: Location, cachedSummary: string | null): string {
  const trimmedCachedSummary = cachedSummary?.trim();
  if (trimmedCachedSummary) {
    return trimmedCachedSummary;
  }
  const editorialSummary = LOCATION_EDITORIAL_SUMMARIES[location.id]?.trim();
  if (editorialSummary) {
    return editorialSummary;
  }
  if (location.shortDescription && location.shortDescription.trim().length > 0) {
    return location.shortDescription.trim();
  }

  const descriptor =
    CATEGORY_DESCRIPTORS[location.category.toLowerCase()] ?? "Notable experience";
  const cityPiece = location.city ? ` in ${location.city}` : "";

  const details: string[] = [];
  if (location.minBudget) {
    details.push(`Budget ${location.minBudget}`);
  }
  if (location.estimatedDuration) {
    details.push(`Plan for ${location.estimatedDuration}`);
  }

  const detailsSentence = details.length > 0 ? ` ${details.join(" • ")}` : "";

  return `${descriptor}${cityPiece}.${detailsSentence || " Easily fits into most itineraries."}`;
}

function getLocationRating(location: Location): number | null {
  const baseValue = Number.isFinite(location.rating)
    ? clamp(location.rating as number, 0, 5)
    : generateRatingFromId(location.id);

  return baseValue ? Math.round(baseValue * 10) / 10 : null;
}

function getLocationReviewCount(location: Location): number | null {
  if (Number.isFinite(location.reviewCount) && (location.reviewCount as number) > 0) {
    return location.reviewCount as number;
  }
  // Generate a deterministic fallback based on location id
  const hash = hashString(location.id + "-reviews");
  return 50 + (hash % 450); // 50-500 range
}

function formatReviewCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

function generateRatingFromId(seed: string): number {
  const hash = hashString(seed);
  const rating = 3.9 + (hash % 18) / 20; // 3.9 - 4.8 range
  return clamp(rating, 0, 5);
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function StarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 text-amber-500"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
    </svg>
  );
}


