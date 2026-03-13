import type { Location } from "@/types/location";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kokutravel.com";

/**
 * Build JSON-LD structured data for a place detail page.
 * Uses TouristAttraction (or LocalBusiness for food/shopping) with AggregateRating.
 */
export function buildPlaceJsonLd(location: Location) {
  const FOOD_CATEGORIES = new Set([
    "restaurant",
    "cafe",
    "bar",
    "market",
  ]);
  const isFood = FOOD_CATEGORIES.has(location.category);

  const schemaType = isFood ? "LocalBusiness" : "TouristAttraction";

  return {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: location.name,
    ...(location.nameJapanese && { alternateName: location.nameJapanese }),
    ...(location.shortDescription && { description: location.shortDescription }),
    ...(location.description &&
      !location.shortDescription && {
        description: location.description.slice(0, 300),
      }),
    url: `${BASE_URL}/places/${location.id}`,
    ...(location.primaryPhotoUrl && { image: location.primaryPhotoUrl }),
    ...(location.coordinates && {
      geo: {
        "@type": "GeoCoordinates",
        latitude: location.coordinates.lat,
        longitude: location.coordinates.lng,
      },
    }),
    ...(location.coordinates && {
      address: {
        "@type": "PostalAddress",
        addressLocality: location.city,
        addressCountry: "JP",
      },
    }),
    ...(location.rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: location.rating,
        bestRating: 5,
        ...(location.reviewCount && { reviewCount: location.reviewCount }),
      },
    }),
    ...(location.websiteUri && { sameAs: location.websiteUri }),
    ...(location.phoneNumber && { telephone: location.phoneNumber }),
    isPartOf: {
      "@type": "TouristDestination",
      name: `${location.city}, Japan`,
    },
  };
}
