import type { Metadata } from "next";

import {
  HeroB,
  StatsB,
  ShowcaseB,
  FeaturedLocationsB,
  FeaturedExperiencesB,
  TestimonialsB,
  FeaturedGuidesB,
  FinalCtaB,
} from "@b/landing";
import { fetchTopRatedLocations, getLocationCount } from "@/lib/locations/locationService";
import { getLandingPageContent } from "@/lib/sanity/contentService";
import { getFeaturedGuides } from "@/lib/guides/guideService";
import { getFeaturedExperiences } from "@/lib/experiences/experienceService";

export const metadata: Metadata = {
  title: "Koku Travel - Discover Japan with Local Experts",
  description:
    "Discover curated travel guides, itineraries, and inspiration from local experts. Plan your perfect trip to Japan with personalized recommendations.",
};

export const revalidate = 3600;

export default async function VariantBHome() {
  const [featuredLocations, locationCount, landingContent, guides, experiences] =
    await Promise.all([
      fetchTopRatedLocations({ limit: 8 }),
      getLocationCount(),
      getLandingPageContent(),
      getFeaturedGuides(3),
      getFeaturedExperiences(3),
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
      <FeaturedExperiencesB experiences={experiences} />
      <TestimonialsB content={landingContent ?? undefined} />
      <FeaturedGuidesB guides={guides} />
      <FinalCtaB content={landingContent ?? undefined} />
    </>
  );
}
