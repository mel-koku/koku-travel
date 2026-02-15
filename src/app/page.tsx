import type { Metadata } from "next";

import {
  HeroOpening,
  Philosophy,
  ImmersiveShowcase,
  FeaturedLocations,
  FeaturedExperiences,
  TestimonialTheater,
  FeaturedGuides,
  FinalCTA,
} from "@/components/landing";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { fetchTopRatedLocations, getLocationCount } from "@/lib/locations/locationService";
import { getFeaturedGuides } from "@/lib/guides/guideService";
import { getFeaturedExperiences } from "@/lib/experiences/experienceService";
import { getLandingPageContent } from "@/lib/sanity/contentService";

export const metadata: Metadata = {
  title: "Koku Travel - Discover Japan with Local Experts",
  description: "Discover curated travel guides, itineraries, and inspiration from local experts. Plan your perfect trip to Japan with personalized recommendations.",
  openGraph: {
    title: "Koku Travel - Discover Japan with Local Experts",
    description: "Discover curated travel guides, itineraries, and inspiration from local experts. Plan your perfect trip to Japan with personalized recommendations.",
    siteName: "Koku Travel",
  },
};

export const revalidate = 3600;

export default async function Home() {
  const [featuredLocations, locationCount, featuredGuides, featuredExperiences, landingContent] =
    await Promise.all([
      fetchTopRatedLocations({ limit: 8 }),
      getLocationCount(),
      getFeaturedGuides(3),
      getFeaturedExperiences(3),
      getLandingPageContent(),
    ]);

  return (
    <main className="flex flex-col">
      <HeroOpening
        locationCount={locationCount}
        content={landingContent ?? undefined}
      />
      <Philosophy
        locationCount={locationCount}
        content={landingContent ?? undefined}
      />
      <ErrorBoundary fallback={null}>
        <ImmersiveShowcase content={landingContent ?? undefined} />
      </ErrorBoundary>
      <ErrorBoundary fallback={null}>
        <FeaturedLocations
          locations={featuredLocations}
          content={landingContent ?? undefined}
        />
      </ErrorBoundary>
      <ErrorBoundary fallback={null}>
        <FeaturedExperiences
          experiences={featuredExperiences}
          content={landingContent ?? undefined}
        />
      </ErrorBoundary>
      <ErrorBoundary fallback={null}>
        <TestimonialTheater content={landingContent ?? undefined} />
      </ErrorBoundary>
      <FeaturedGuides
        guides={featuredGuides}
        content={landingContent ?? undefined}
      />
      <FinalCTA content={landingContent ?? undefined} />
    </main>
  );
}
