"use client";

import { useCallback, useMemo } from "react";

import { useWishlist } from "@/context/WishlistContext";
import { Modal } from "@/components/ui/Modal";
import type { Location } from "@/types/location";
import { HeartIcon } from "./LocationCard";
import { useLocationDetails } from "./LocationDetailsModal/useLocationDetails";
import { LocationDetailsLoading } from "./LocationDetailsModal/LocationDetailsLoading";
import { LocationDetailsError } from "./LocationDetailsModal/LocationDetailsError";
import { LocationHeroImage } from "./LocationDetailsModal/LocationHeroImage";
import { LocationDetailsSections } from "./LocationDetailsModal/LocationDetailsSections";
import { LocationPhotos } from "./LocationDetailsModal/LocationPhotos";

type LocationDetailsModalProps = {
  location: Location | null;
  onClose: () => void;
};

export function LocationDetailsModal({ location, onClose }: LocationDetailsModalProps) {
  const locationId = location?.id ?? null;
  const { status, details, errorMessage, retry } = useLocationDetails(locationId);
  const { isInWishlist, toggleWishlist } = useWishlist();

  const isFavorite = locationId ? isInWishlist(locationId) : false;

  const handleToggleFavorite = useCallback(() => {
    if (!locationId) return;
    toggleWishlist(locationId);
  }, [locationId, toggleWishlist]);

  const favoriteButton = useMemo(() => {
    if (!location) return null;
    return (
      <button
        type="button"
        onClick={handleToggleFavorite}
        aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
        className={`rounded-full border border-gray-200 bg-white/90 p-2 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${isFavorite ? "text-indigo-600" : "text-gray-400"}`}
      >
        <HeartIcon active={isFavorite} />
      </button>
    );
  }, [location, isFavorite, handleToggleFavorite]);

  const heroImageAlt = useMemo(
    () => (location ? `${location.name} hero photo` : "Location photo"),
    [location],
  );

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
      {status === "loading" && <LocationDetailsLoading />}

      {status === "error" && (
        <LocationDetailsError errorMessage={errorMessage} onRetry={retry} />
      )}

      {status === "success" && details && (
        <div className="space-y-8">
          <LocationHeroImage
            location={location}
            details={details}
            favoriteButton={favoriteButton}
          />

          <LocationDetailsSections location={location} details={details} />

          <LocationPhotos details={details} heroImageAlt={heroImageAlt} />
        </div>
      )}
    </Modal>
  );
}
