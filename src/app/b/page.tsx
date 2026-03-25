import type { Metadata } from "next";

import {
  HeroB,
  StatsB,
  ShowcaseB,
  FeaturedLocationsB,
  TestimonialsB,
  FeaturedGuidesB,
  FinalCtaB,
} from "@b/landing";
import { fetchTopRatedLocations, getLocationCount } from "@/lib/locations/locationService";
import { getLandingPageContent } from "@/lib/sanity/contentService";
import { getFeaturedGuides } from "@/lib/guides/guideService";

export const metadata: Metadata = {
  title: "Koku Travel - Discover Japan with Local Experts",
  description:
    "Discover curated travel guides, itineraries, and inspiration for Japan. Plan your perfect trip with personalized recommendations.",
  alternates: {
    canonical: "/",
  },
};

export const revalidate = 3600;

export default async function VariantBHome() {
  const [featuredLocations, locationCount, landingContent, guides] =
    await Promise.all([
      fetchTopRatedLocations({ limit: 8 }),
      getLocationCount(),
      getLandingPageContent(),
      getFeaturedGuides(3),
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
      <ShowcaseB content={landingContent ?? undefined} />
      <FeaturedLocationsB
        locations={featuredLocations}
        content={landingContent ?? undefined}
      />
      <TestimonialsB content={landingContent ?? undefined} />
      <FeaturedGuidesB guides={guides} />
      <FinalCtaB content={landingContent ?? undefined} />
    </>
  );
}
