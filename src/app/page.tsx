import type { Metadata } from "next";

import {
  HeroOpening,
  Philosophy,
  ImmersiveShowcase,
  FeaturedLocations,
  FeaturedExperiences,
  SeasonalSpotlight,
  TestimonialTheater,
  FeaturedGuides,
  FinalCTA,
} from "@/components/landing";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { fetchTopRatedLocations, fetchSeasonalLocations, getLocationCount } from "@/lib/locations/locationService";
import { getFeaturedGuides, getGuidesBySeason } from "@/lib/guides/guideService";
import { getFeaturedExperiences, getExperiencesBySeason } from "@/lib/experiences/experienceService";
import { getLandingPageContent } from "@/lib/sanity/contentService";
import { urlFor } from "@/sanity/image";
import { getCurrentSeason, getCurrentMonth, seasonToSanityBestSeason } from "@/lib/utils/seasonUtils";

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
  const currentSeason = getCurrentSeason();
  const currentMonth = getCurrentMonth();
  const sanitySeason = seasonToSanityBestSeason(currentSeason);

  const [featuredLocations, locationCount, featuredGuides, featuredExperiences, landingContent, seasonalGuides, seasonalExperiences, seasonalLocations] =
    await Promise.all([
      fetchTopRatedLocations({ limit: 8 }),
      getLocationCount(),
      getFeaturedGuides(3),
      getFeaturedExperiences(3),
      getLandingPageContent(),
      getGuidesBySeason(sanitySeason, 3),
      getExperiencesBySeason(sanitySeason, 3),
      fetchSeasonalLocations(currentMonth, 6),
    ]);

  // Preload LCP hero image — browser starts fetching before parsing full DOM
  const heroImage = landingContent?.heroImage;
  const lcpImageUrl = heroImage
    ? urlFor(heroImage).width(1920).quality(85).url()
    : "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1920&q=80";

  return (
    <>
      <link rel="preload" as="image" href={lcpImageUrl} />
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
          <SeasonalSpotlight
            season={currentSeason}
            guides={seasonalGuides}
            experiences={seasonalExperiences}
            locations={seasonalLocations}
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
    </>
  );
}
