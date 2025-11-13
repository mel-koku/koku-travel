"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { RefObject } from "react";

import { useWishlist } from "@/context/WishlistContext";
import { LOCATION_EDITORIAL_SUMMARIES } from "@/data/locationEditorialSummaries";
import { useLocationEditorialSummary } from "@/state/locationDetailsStore";
import type { Location } from "@/types/location";

type LocationCardProps = {
  location: Location;
  onSelect?: (location: Location) => void;
};

export function LocationCard({ location, onSelect }: LocationCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const active = isInWishlist(location.id);
  const cachedEditorialSummary = useLocationEditorialSummary(location.id);
  const summary = getShortOverview(location, cachedEditorialSummary);
  const estimatedDuration = location.estimatedDuration?.trim();
  const rating = getLocationRating(location);
  const reviewCount = getLocationReviewCount(location);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const isVisible = useInViewport(buttonRef);
  const primaryPhotoUrl = usePrimaryPhoto(location.id, isVisible);
  const imageSrc = primaryPhotoUrl ?? location.image;

  return (
    <article className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white hover:shadow-lg transition text-gray-900 focus-within:ring-2 focus-within:ring-indigo-500">
      <button
        aria-label={active ? "Remove from Trip" : "Add to Trip"}
        onClick={(event) => {
          event.stopPropagation();
          toggleWishlist(location.id);
        }}
        className={`absolute top-3 right-3 z-10 rounded-full border border-gray-200 bg-white/90 p-2 text-gray-400 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${active ? "text-indigo-600" : "text-gray-400"}`}
      >
        <HeartIcon active={active} />
      </button>
      <button
        type="button"
        onClick={() => onSelect?.(location)}
        ref={buttonRef}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        <div className="relative h-48 w-full">
          <Image
            src={imageSrc || FALLBACK_IMAGE_SRC}
            alt={location.name}
            fill
            className="object-cover"
            sizes="(min-width:1280px) 25vw, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
            priority={false}
          />
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900">{location.name}</h3>
              <p className="text-sm text-gray-600">
                {location.city}, {location.region}
              </p>
            </div>

            {rating ? (
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-gray-800 shadow-sm ring-1 ring-gray-200">
                <StarIcon />
                <span>{rating.toFixed(1)}</span>
                {reviewCount ? (
                  <span className="text-[11px] font-normal text-gray-500">
                    ({numberFormatter.format(reviewCount)})
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <p className="text-sm leading-relaxed text-gray-700">{summary}</p>

          <div className="flex flex-wrap gap-2 pt-1">
            <span className="inline-block text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700">
              {location.category}
            </span>
            {estimatedDuration ? (
              <span className="inline-block text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 font-semibold">
                Est. {estimatedDuration}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    </article>
  );
}

export function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={active ? "h-4 w-4 fill-indigo-600 stroke-indigo-600" : "h-4 w-4 stroke-current"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19.5 13.572a24.064 24.064 0 0 1-7.5 7.178 24.064 24.064 0 0 1-7.5-7.178C3.862 12.334 3 10.478 3 8.52 3 5.989 5.014 4 7.5 4c1.54 0 2.994.757 4 1.955C12.506 4.757 13.96 4 15.5 4 17.986 4 20 5.989 20 8.52c0 1.958-.862 3.813-2.5 5.052Z" />
    </svg>
  );
}

const numberFormatter = new Intl.NumberFormat("en-US");

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
  if (Number.isInteger(location.reviewCount) && (location.reviewCount as number) > 0) {
    return location.reviewCount as number;
  }
  return generateReviewCountFromId(location.id);
}

function generateRatingFromId(seed: string): number {
  const hash = hashString(seed);
  const rating = 3.9 + (hash % 18) / 20; // 3.9 - 4.8 range
  return clamp(rating, 0, 5);
}

function generateReviewCountFromId(seed: string): number {
  const hash = hashString(seed);
  return 120 + (hash % 780) + Math.floor(hash % 4) * 100;
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

type PrimaryPhotoSuccessResponse = {
  placeId: string;
  fetchedAt: string;
  photo: {
    proxyUrl?: string;
  } | null;
};

type PrimaryPhotoErrorResponse = {
  error?: string;
};

type PhotoStoreEntry = {
  status: "loaded";
  url: string | null;
};

const photoStore = new Map<string, PhotoStoreEntry>();
const photoPromises = new Map<string, Promise<void>>();
const photoListeners = new Map<string, Set<() => void>>();
let hasLoggedPrimaryPhotoError = false;

function usePrimaryPhoto(locationId: string, shouldLoad: boolean): string | null {
  const photoUrl = useSyncExternalStore(
    (listener) => subscribeToPhoto(locationId, listener),
    () => getPhotoSnapshot(locationId),
    () => null,
  );

  useEffect(() => {
    if (!shouldLoad) {
      return;
    }

    ensurePrimaryPhoto(locationId);
  }, [locationId, shouldLoad]);

  return photoUrl ?? null;
}

function getPhotoSnapshot(locationId: string): string | null {
  const entry = photoStore.get(locationId);
  return entry?.url ?? null;
}

function subscribeToPhoto(locationId: string, listener: () => void): () => void {
  let listeners = photoListeners.get(locationId);
  if (!listeners) {
    listeners = new Set();
    photoListeners.set(locationId, listeners);
  }
  listeners.add(listener);
  return () => {
    listeners?.delete(listener);
    if (listeners && listeners.size === 0) {
      photoListeners.delete(locationId);
    }
  };
}

function notifyPhotoListeners(locationId: string) {
  const listeners = photoListeners.get(locationId);
  if (!listeners) {
    return;
  }
  listeners.forEach((listener) => listener());
}

function ensurePrimaryPhoto(locationId: string) {
  if (photoStore.get(locationId)?.status === "loaded") {
    return;
  }

  if (photoPromises.has(locationId)) {
    return;
  }

  const promise = requestPrimaryPhoto(locationId)
    .then((url) => {
      photoStore.set(locationId, { status: "loaded", url });
      notifyPhotoListeners(locationId);
    })
    .catch((error) => {
      photoStore.set(locationId, { status: "loaded", url: null });
      notifyPhotoListeners(locationId);
      if (process.env.NODE_ENV !== "production" && !hasLoggedPrimaryPhotoError) {
        console.debug(
          `[LocationCard] Unable to load Google Places primary photo for ${locationId}`,
          error,
        );
        hasLoggedPrimaryPhotoError = true;
      }
    })
    .finally(() => {
      photoPromises.delete(locationId);
    });

  photoPromises.set(locationId, promise);
}

async function requestPrimaryPhoto(locationId: string): Promise<string | null> {
  const response = await fetch(`/api/locations/${locationId}/primary-photo`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    let message = `Failed to load primary photo for location "${locationId}".`;
    try {
      const payload = (await response.json()) as PrimaryPhotoErrorResponse;
      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      // Ignore JSON parsing issues on error responses.
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as PrimaryPhotoSuccessResponse;
  return payload.photo?.proxyUrl ?? null;
}

function useInViewport<T extends Element>(ref: RefObject<T | null>): boolean {
  const [isIntersecting, setIsIntersecting] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return typeof window.IntersectionObserver === "undefined";
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const element = ref.current;
    if (!element) {
      return;
    }

    if (typeof window.IntersectionObserver === "undefined") {
      return;
    }

    const observer = new window.IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsIntersecting(true);
            obs.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "120px" },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return isIntersecting;
}


