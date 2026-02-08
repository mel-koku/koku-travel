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

/**
 * Displays a single primary photo for the location.
 * Photo gallery removed to reduce Google API costs - uses pre-enriched primary_photo_url from database.
 */
export function PhotoCarousel({
  location,
  details,
  isFavorite,
  isInItinerary,
  heartAnimating,
  onToggleFavorite,
  onToggleItinerary,
}: PhotoCarouselProps) {
  // Use first photo from details or fall back to location image
  const photos = details?.photos ?? [];
  const primaryPhoto = photos[0] ?? null;
  const photoUrl = primaryPhoto?.proxyUrl ?? location.image ?? null;

  const displayName = getLocationDisplayName(details?.displayName, location);
  const imageAlt = `${displayName} photo`;

  if (!photoUrl) {
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

  return (
    <div className="relative">
      {/* Image container with rounded corners */}
      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
        {/* Single primary image */}
        <div className="relative h-72 w-full overflow-hidden bg-surface">
          <Image
            src={photoUrl || FALLBACK_IMAGE_SRC}
            alt={imageAlt}
            fill
            unoptimized
            className="object-cover"
            sizes="(min-width:1024px) 60vw, 100vw"
            priority
          />
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
    <div className="flex items-center justify-between border-t border-border px-4 py-3">
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        className={`rounded-full p-2 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal ${
          isFavorite ? "text-destructive" : "text-foreground-secondary"
        }`}
      >
        <HeartIcon active={isFavorite} animating={heartAnimating} />
      </button>

      <button
        type="button"
        onClick={onToggleItinerary}
        aria-label={isInItinerary ? "Remove from itinerary" : "Add to itinerary"}
        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal ${
          isInItinerary ? "text-sage" : "text-foreground-secondary"
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

