"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import type { Location, LocationDetails } from "@/types/location";
import { getLocationDisplayName } from "@/lib/locationNameUtils";
import { HeartIcon } from "../LocationCard";
import { PlusIcon } from "../PlusIcon";
import { MinusIcon } from "../MinusIcon";

const FALLBACK_IMAGE_SRC =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

type PhotoCarouselProps = {
  location: Location;
  details: LocationDetails | null;
  isFavorite: boolean;
  isInItinerary: boolean;
  heartAnimating?: boolean;
  onToggleFavorite: () => void;
  onToggleItinerary: () => void;
};

export function PhotoCarousel({
  location,
  details,
  isFavorite,
  isInItinerary,
  heartAnimating,
  onToggleFavorite,
  onToggleItinerary,
}: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const photos = details?.photos ?? [];
  const fallbackImage = location.image ?? null;

  // If no photos from API, use location image as single photo
  const allPhotos = photos.length > 0
    ? photos
    : fallbackImage
      ? [{ name: "fallback", proxyUrl: fallbackImage, attributions: [] }]
      : [];

  const displayName = getLocationDisplayName(details?.displayName, location);
  const imageAlt = `${displayName} photo`;

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? allPhotos.length - 1 : prev - 1));
  }, [allPhotos.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === allPhotos.length - 1 ? 0 : prev + 1));
  }, [allPhotos.length]);

  if (allPhotos.length === 0) {
    return (
      <ActionBar
        isFavorite={isFavorite}
        isInItinerary={isInItinerary}
        heartAnimating={heartAnimating}
        onToggleFavorite={onToggleFavorite}
        onToggleItinerary={onToggleItinerary}
      />
    );
  }

  const currentPhoto = allPhotos[currentIndex];

  return (
    <div className="relative">
      {/* Image container with rounded corners */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {/* Main image */}
        <div className="relative h-72 w-full overflow-hidden bg-gray-100">
          <Image
            src={currentPhoto?.proxyUrl || FALLBACK_IMAGE_SRC}
            alt={`${imageAlt} ${currentIndex + 1}`}
            fill
            className="object-cover"
            sizes="(min-width:1024px) 60vw, 100vw"
            priority={currentIndex === 0}
          />

          {/* Navigation arrows - only show if more than 1 photo */}
          {allPhotos.length > 1 && (
            <>
              <button
                type="button"
                onClick={goToPrevious}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label="Previous photo"
              >
                <ChevronLeftIcon />
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label="Next photo"
              >
                <ChevronRightIcon />
              </button>
            </>
          )}

          {/* Photo counter */}
          {allPhotos.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
              {currentIndex + 1} / {allPhotos.length}
            </div>
          )}
        </div>

        {/* Action bar below image */}
        <ActionBar
          isFavorite={isFavorite}
          isInItinerary={isInItinerary}
          heartAnimating={heartAnimating}
          onToggleFavorite={onToggleFavorite}
          onToggleItinerary={onToggleItinerary}
        />
      </div>

      {/* Thumbnail strip - only show if more than 1 photo */}
      {allPhotos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {allPhotos.map((photo, index) => (
            <button
              key={photo.name || index}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={`relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg transition ${
                index === currentIndex
                  ? "ring-2 ring-indigo-500 ring-offset-2"
                  : "opacity-70 hover:opacity-100"
              }`}
              aria-label={`View photo ${index + 1}`}
            >
              <Image
                src={photo.proxyUrl || FALLBACK_IMAGE_SRC}
                alt={`${imageAlt} thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type ActionBarProps = {
  isFavorite: boolean;
  isInItinerary: boolean;
  heartAnimating?: boolean;
  onToggleFavorite: () => void;
  onToggleItinerary: () => void;
};

function ActionBar({
  isFavorite,
  isInItinerary,
  heartAnimating,
  onToggleFavorite,
  onToggleItinerary,
}: ActionBarProps) {
  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        className={`rounded-md p-2 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 ${
          isFavorite ? "text-red-500" : "text-gray-600"
        }`}
      >
        <HeartIcon active={isFavorite} animating={heartAnimating} />
      </button>

      <button
        type="button"
        onClick={onToggleItinerary}
        aria-label={isInItinerary ? "Remove from itinerary" : "Add to itinerary"}
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 ${
          isInItinerary ? "text-indigo-600" : "text-gray-600"
        }`}
      >
        {isInItinerary ? (
          <MinusIcon className="h-5 w-5" />
        ) : (
          <PlusIcon className="h-5 w-5" />
        )}
        <span>{isInItinerary ? "Remove from Itinerary" : "Add to Itinerary"}</span>
      </button>
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="h-5 w-5 text-gray-700"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="h-5 w-5 text-gray-700"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
