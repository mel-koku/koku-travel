import type { Metadata } from "next";

import {
  HeroB,
  StatsB,
  FeaturedLocationsB,
  TestimonialsB,
  FinalCtaB,
} from "@b/landing";
import { fetchTopRatedLocations, getLocationCount } from "@/lib/locations/locationService";
import { getLandingPageContent } from "@/lib/sanity/contentService";

export const metadata: Metadata = {
  title: "Koku Travel - Discover Japan with Local Experts",
  description:
    "Discover curated travel guides, itineraries, and inspiration from local experts. Plan your perfect trip to Japan with personalized recommendations.",
};

export const revalidate = 3600;

export default async function VariantBHome() {
  const [featuredLocations, locationCount, landingContent] = await Promise.all([
    fetchTopRatedLocations({ limit: 8 }),
    getLocationCount(),
    getLandingPageContent(),
  ]);

  return (
    <>
      <HeroB
        locationCount={locationCount}
        content={landingContent ?? undefined}
      />
      <StatsB
        locationCount={locationCount}
        content={landingContent ?? undefined}
      />
      <FeaturedLocationsB
        locations={featuredLocations}
        content={landingContent ?? undefined}
      />
      <TestimonialsB content={landingContent ?? undefined} />
      <FinalCtaB content={landingContent ?? undefined} />
    </>
  );
}
