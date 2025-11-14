import Image from "next/image";
import type { Location, LocationDetails } from "@/types/location";

const FALLBACK_IMAGE_SRC =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

type LocationHeroImageProps = {
  location: Location;
  details: LocationDetails | null;
  favoriteButton: React.ReactNode;
};

export function LocationHeroImage({ location, details, favoriteButton }: LocationHeroImageProps) {
  const heroImageUrl = details?.photos?.[0]?.proxyUrl ?? location.image ?? null;
  const heroImageAlt = `${location.name} hero photo`;

  if (!heroImageUrl) {
    return favoriteButton ? <div className="flex justify-end">{favoriteButton}</div> : null;
  }

  return (
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
  );
}

