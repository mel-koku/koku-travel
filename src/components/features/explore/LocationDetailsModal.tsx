"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";

import { useWishlist } from "@/context/WishlistContext";
import { Modal } from "@/components/ui/Modal";
import type { Location } from "@/types/location";
import { TripPickerModal } from "./TripPickerModal";
import { useLocationDetails } from "./LocationDetailsModal/useLocationDetails";
import { LocationDetailsLoading } from "./LocationDetailsModal/LocationDetailsLoading";
import { LocationDetailsError } from "./LocationDetailsModal/LocationDetailsError";
import { PhotoCarousel } from "./LocationDetailsModal/PhotoCarousel";
import { LocationDetailsSections } from "./LocationDetailsModal/LocationDetailsSections";
import { getLocationDisplayName } from "@/lib/locationNameUtils";
import { useAddToItinerary } from "@/hooks/useAddToItinerary";

type LocationDetailsModalProps = {
  location: Location | null;
  onClose: () => void;
};

export function LocationDetailsModal({ location, onClose }: LocationDetailsModalProps) {
  const locationId = location?.id ?? null;
  const { status, details, errorMessage, retry } = useLocationDetails(locationId);
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { trips, needsTripPicker, isInItinerary, addToItinerary, removeFromItinerary } = useAddToItinerary();
  const locationInItinerary = locationId ? isInItinerary(locationId) : false;
  const [tripPickerOpen, setTripPickerOpen] = useState(false);
  const [heartAnimating, setHeartAnimating] = useState(false);

  const isFavorite = locationId ? isInWishlist(locationId) : false;
  const wasInWishlist = useRef(isFavorite);

  // Track when location is auto-favorited to trigger animation
  useEffect(() => {
    if (isFavorite && !wasInWishlist.current) {
      setHeartAnimating(true);
      const timer = setTimeout(() => setHeartAnimating(false), 500);
      return () => clearTimeout(timer);
    }
    wasInWishlist.current = isFavorite;
  }, [isFavorite]);

  const handleToggleFavorite = useCallback(() => {
    if (!locationId) return;
    toggleWishlist(locationId);
  }, [locationId, toggleWishlist]);

  const handleToggleItinerary = useCallback(() => {
    if (!location) return;
    if (locationInItinerary) {
      removeFromItinerary(location.id);
    } else if (needsTripPicker) {
      setTripPickerOpen(true);
    } else {
      addToItinerary(location.id, location);
    }
  }, [location, locationInItinerary, needsTripPicker, addToItinerary, removeFromItinerary]);

  const handleTripSelect = useCallback(
    (tripId: string) => {
      if (!location) return;
      addToItinerary(location.id, location, tripId);
    },
    [addToItinerary, location]
  );

  const displayName = useMemo(() => {
    if (!location) return null;
    return getLocationDisplayName(details?.displayName, location);
  }, [location, details]);

  if (!location) {
    return null;
  }

  return (
    <>
      <Modal
        isOpen={Boolean(location)}
        onClose={onClose}
        title={displayName ?? location.name}
        description={`${location.city}, ${location.region}`}
        panelClassName="max-w-4xl"
      >
        {status === "loading" && <LocationDetailsLoading />}

        {status === "error" && (
          <LocationDetailsError errorMessage={errorMessage} onRetry={retry} />
        )}

        {status === "success" && details && (
          <div className="space-y-8">
            <PhotoCarousel
              location={location}
              details={details}
              isFavorite={isFavorite}
              isInItinerary={locationInItinerary}
              heartAnimating={heartAnimating}
              onToggleFavorite={handleToggleFavorite}
              onToggleItinerary={handleToggleItinerary}
            />

            <LocationDetailsSections location={location} details={details} />
          </div>
        )}
      </Modal>

      <TripPickerModal
        isOpen={tripPickerOpen}
        onClose={() => setTripPickerOpen(false)}
        trips={trips}
        onSelectTrip={handleTripSelect}
        locationName={displayName ?? location.name}
      />
    </>
  );
}
