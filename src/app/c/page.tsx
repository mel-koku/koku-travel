import type { Metadata } from "next";

import {
  HeroC,
  PhilosophyC,
  ShowcaseC,
  SeasonalSpotlightC,
  FeaturedLocationsC,
  FeaturedExperiencesC,
  TestimonialsC,
  FeaturedGuidesC,
  AskKokuPreviewC,
  TypographicBreakC,
  FinalCtaC,
} from "@c/landing";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  fetchTopRatedLocations,
  fetchSeasonalLocations,
  getLocationCount,
} from "@/lib/locations/locationService";
import { getFeaturedGuides, getGuidesBySeason } from "@/lib/guides/guideService";
import {
  getFeaturedExperiences,
  getExperiencesBySeason,
} from "@/lib/experiences/experienceService";
import { getLandingPageContent } from "@/lib/sanity/contentService";
import { urlFor } from "@/sanity/image";
import {
  getCurrentSeason,
  getCurrentMonth,
  seasonToSanityBestSeason,
} from "@/lib/utils/seasonUtils";

export const metadata: Metadata = {
  title: "Koku Travel | Plan Your Trip to Japan",
  description:
    "6,000+ places we'd actually recommend. Build a trip to Japan, day by day, with routing and timing handled for you.",
  alternates: {
    canonical: "/c",
  },
  openGraph: {
    title: "Koku Travel | Plan Your Trip to Japan",
    description:
      "6,000+ places we'd actually recommend. Build a trip to Japan, day by day, with routing and timing handled for you.",
    siteName: "Koku Travel",
  },
};

export const revalidate = 3600;

export default async function HomeCPage() {
  const currentSeason = getCurrentSeason();
  const currentMonth = getCurrentMonth();
  const sanitySeason = seasonToSanityBestSeason(currentSeason);

  const [
    featuredLocations,
    locationCount,
    featuredGuides,
    featuredExperiences,
    landingContent,
    seasonalGuides,
    seasonalExperiences,
    seasonalLocations,
  ] = await Promise.all([
    fetchTopRatedLocations({ limit: 8 }),
    getLocationCount(),
    getFeaturedGuides(3),
    getFeaturedExperiences(3),
    getLandingPageContent(),
    getGuidesBySeason(sanitySeason, 3),
    getExperiencesBySeason(sanitySeason, 3),
    fetchSeasonalLocations(currentMonth, 6),
  ]);

  // Preload LCP hero image
  const heroImage = landingContent?.heroImage;
  const lcpImageUrl = heroImage
    ? urlFor(heroImage).width(1400).quality(85).url()
    : "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1920&q=80";

  return (
    <>
      <link rel="preload" as="image" href={lcpImageUrl} />
      <main>
        <HeroC
          locationCount={locationCount}
          content={landingContent ?? undefined}
        />
        <PhilosophyC
          locationCount={locationCount}
          content={landingContent ?? undefined}
        />
        <ErrorBoundary fallback={null}>
          <ShowcaseC content={landingContent ?? undefined} />
        </ErrorBoundary>
        <ErrorBoundary fallback={null}>
          <FeaturedLocationsC
            locations={featuredLocations}
            content={landingContent ?? undefined}
          />
        </ErrorBoundary>
        <ErrorBoundary fallback={null}>
          <TestimonialsC content={landingContent ?? undefined} />
        </ErrorBoundary>
        <ErrorBoundary fallback={null}>
          <SeasonalSpotlightC
            season={currentSeason}
            guides={seasonalGuides}
            experiences={seasonalExperiences}
            locations={seasonalLocations}
            content={landingContent ?? undefined}
          />
        </ErrorBoundary>
        <ErrorBoundary fallback={null}>
          <FeaturedExperiencesC
            experiences={featuredExperiences}
            content={landingContent ?? undefined}
          />
        </ErrorBoundary>
        <ErrorBoundary fallback={null}>
          <AskKokuPreviewC />
        </ErrorBoundary>
        <ErrorBoundary fallback={null}>
          <FeaturedGuidesC
            guides={featuredGuides}
            content={landingContent ?? undefined}
          />
        </ErrorBoundary>

        <TypographicBreakC />

        <FinalCtaC content={landingContent ?? undefined} />
      </main>
    </>
  );
}
