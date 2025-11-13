"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { useWishlist } from "@/context/WishlistContext";
import { Modal } from "@/components/ui/Modal";
import { cacheLocationDetails } from "@/state/locationDetailsStore";
import type { Location, LocationDetails } from "@/types/location";
import { HeartIcon } from "./LocationCard";

type LocationDetailsModalProps = {
  location: Location | null;
  onClose: () => void;
};

type FetchStatus = "idle" | "loading" | "success" | "error";

const FALLBACK_IMAGE_SRC =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export function LocationDetailsModal({ location, onClose }: LocationDetailsModalProps) {
  const cacheRef = useRef<Map<string, LocationDetails>>(new Map());
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [details, setDetails] = useState<LocationDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const { isInWishlist, toggleWishlist } = useWishlist();

  const locationId = location?.id ?? null;
  const isFavorite = locationId ? isInWishlist(locationId) : false;

  const handleToggleFavorite = () => {
    if (!locationId) return;
    toggleWishlist(locationId);
  };

  const favoriteButton = location
    ? (
        <button
          type="button"
          onClick={handleToggleFavorite}
          aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
          className={`rounded-full border border-gray-200 bg-white/90 p-2 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${isFavorite ? "text-indigo-600" : "text-gray-400"}`}
        >
          <HeartIcon active={isFavorite} />
        </button>
      )
    : null;

  useEffect(() => {
    if (!locationId || !location) {
      setStatus("idle");
      setDetails(null);
      setErrorMessage(null);
      return;
    }

    const cachedDetails = cacheRef.current.get(locationId);
    if (cachedDetails) {
      setDetails(cachedDetails);
      setStatus("success");
      setErrorMessage(null);
      cacheLocationDetails(locationId, cachedDetails);
      return;
    }

    const controller = new AbortController();
    let isMounted = true;

    const fetchDetails = async () => {
      try {
        setStatus("loading");
        setErrorMessage(null);
        setDetails(null);

        const response = await fetch(`/api/locations/${locationId}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          let message = `Request failed with status ${response.status}.`;
          try {
            const payload = await response.json();
            if (payload?.error) {
              message = payload.error as string;
            }
          } catch (jsonError) {
            if (process.env.NODE_ENV !== "production") {
              console.debug("Unable to parse error response", jsonError);
            }
          }
          throw new Error(message);
        }

        const payload = (await response.json()) as { details: LocationDetails };

        if (!isMounted) {
          return;
        }

        cacheRef.current.set(locationId, payload.details);
        cacheLocationDetails(locationId, payload.details);
        setDetails(payload.details);
        setStatus("success");
      } catch (error) {
        if (!isMounted || controller.signal.aborted) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Something went wrong while loading this place.";
        setErrorMessage(message);
        setStatus("error");
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [location, locationId, reloadToken]);

  const heroImageUrl = useMemo(() => {
    if (details?.photos?.[0]?.proxyUrl) {
      return details.photos[0].proxyUrl;
    }
    return location?.image ?? null;
  }, [details, location]);

  const heroImageAlt = location ? `${location.name} hero photo` : "Location photo";
  const additionalPhotos = useMemo(
    () => (details?.photos?.length ? details.photos.slice(1) : []),
    [details],
  );

  const humanReadableError = useMemo(() => {
    if (!errorMessage) return null;
    if (errorMessage.includes("Missing Google Places API key")) {
      return "Add a valid GOOGLE_PLACES_API_KEY in your environment to enable live place details.";
    }
    return errorMessage;
  }, [errorMessage]);

  const handleRetry = () => {
    if (!locationId) return;
    cacheRef.current.delete(locationId);
    setReloadToken((value) => value + 1);
  };

  if (!location) {
    return null;
  }

  return (
    <Modal
      isOpen={Boolean(location)}
      onClose={onClose}
      title={location.name}
      description={`${location.city}, ${location.region}`}
      panelClassName="max-w-4xl"
    >
      {status === "loading" ? (
        <div className="flex flex-col gap-6">
          <div className="h-64 w-full animate-pulse rounded-2xl bg-gray-200" />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-11/12 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-5 w-1/2 animate-pulse rounded bg-gray-200" />
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-4/6 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {humanReadableError ?? "We couldn’t load details for this place just now."}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {status === "success" && details ? (
        <div className="space-y-8">
          {heroImageUrl ? (
            <div className="relative h-64 w-full overflow-hidden rounded-2xl">
              <Image
                src={heroImageUrl || FALLBACK_IMAGE_SRC}
                alt={heroImageAlt}
                fill
                className="object-cover"
                sizes="(min-width:1024px) 60vw, 100vw"
                priority={false}
              />
              {favoriteButton ? (
                <div className="absolute right-4 top-4 z-10">{favoriteButton}</div>
              ) : null}
            </div>
          ) : (
            favoriteButton ? <div className="flex justify-end">{favoriteButton}</div> : null
          )}

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
              {location.category}
            </span>
            {details.rating ? (
              <span className="flex items-center gap-1 text-sm font-medium text-gray-700">
                <StarIcon />
                {details.rating.toFixed(1)}
                {details.userRatingCount ? (
                  <span className="text-xs text-gray-500">
                    ({details.userRatingCount.toLocaleString()} reviews)
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-6">
              {details.editorialSummary ? (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Overview
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{details.editorialSummary}</p>
                </section>
              ) : null}

              {details.formattedAddress ? (
                <section className="space-y-1">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Address
                  </h3>
                  <p className="text-sm text-gray-700">{details.formattedAddress}</p>
                </section>
              ) : null}

              {(details.websiteUri || details.internationalPhoneNumber || details.googleMapsUri) ? (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Details
                  </h3>
                  <ul className="space-y-1 text-sm text-indigo-600">
                    {details.websiteUri ? (
                      <li>
                        <a
                          href={details.websiteUri}
                          target="_blank"
                          rel="noreferrer"
                          className="transition hover:underline"
                        >
                          Official website
                        </a>
                      </li>
                    ) : null}
                    {details.internationalPhoneNumber ? (
                      <li className="text-gray-700">{details.internationalPhoneNumber}</li>
                    ) : null}
                    {details.googleMapsUri ? (
                      <li>
                        <a
                          href={details.googleMapsUri}
                          target="_blank"
                          rel="noreferrer"
                          className="transition hover:underline"
                        >
                          View on Google Maps
                        </a>
                      </li>
                    ) : null}
                  </ul>
                </section>
              ) : null}

              {(details.currentOpeningHours?.length ?? 0) > 0 ||
              (details.regularOpeningHours?.length ?? 0) > 0 ? (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Opening hours
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    {(details.currentOpeningHours ?? details.regularOpeningHours ?? []).map(
                      (entry) => (
                        <li key={entry}>{entry}</li>
                      ),
                    )}
                  </ul>
                </section>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Reviews
                </h3>
                {details.fetchedAt ? (
                  <p className="text-xs text-gray-400">
                    Updated {new Date(details.fetchedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>

              <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                {details.reviews.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Google hasn’t published public review snippets for this location yet.
                  </p>
                ) : (
                  details.reviews.map((review, index) => (
                    <article
                      key={`${review.authorName}-${review.publishTime ?? index}`}
                      className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{review.authorName}</p>
                          {review.relativePublishTimeDescription ? (
                            <p className="text-xs text-gray-500">
                              {review.relativePublishTimeDescription}
                            </p>
                          ) : null}
                        </div>
                        {review.rating ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-gray-700">
                            <StarIcon />
                            {review.rating.toFixed(1)}
                          </span>
                        ) : null}
                      </div>
                      {review.text ? (
                        <p className="mt-2 text-sm leading-relaxed text-gray-700">{review.text}</p>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>

          {additionalPhotos.length > 0 ? (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                More photos
              </h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {additionalPhotos.map((photo) => (
                  <figure key={photo.name} className="overflow-hidden rounded-xl">
                    <div className="relative h-32 w-full">
                      <Image
                        src={photo.proxyUrl || FALLBACK_IMAGE_SRC}
                        alt={photo.name || heroImageAlt}
                        fill
                        className="object-cover"
                        sizes="(min-width:1024px) 20vw, (min-width:768px) 30vw, 50vw"
                      />
                    </div>
                    {photo.attributions.length > 0 ? (
                      <figcaption className="px-2 py-1 text-[11px] text-gray-500">
                        Photo by{" "}
                        {photo.attributions[0]?.uri ? (
                          <a
                            href={photo.attributions[0].uri}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            {photo.attributions[0].displayName ?? "Google contributor"}
                          </a>
                        ) : (
                          photo.attributions[0]?.displayName ?? "Google contributor"
                        )}
                      </figcaption>
                    ) : null}
                  </figure>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
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

