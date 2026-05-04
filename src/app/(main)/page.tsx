import type { Metadata } from "next";
import { DEFAULT_OG_IMAGES } from "@/lib/seo/defaults";

import {
  HeroOpening,
  Philosophy,
  ImmersiveShowcase,
  FeaturedLocations,
  SeasonalSpotlight,
  TestimonialTheater,
  FeaturedGuides,
  FinalCTA,
  AskYukuPreview,
} from "@/components/landing";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LenisProvider } from "@/providers/LenisProvider";
import { fetchTopRatedLocations, fetchSeasonalLocations, getLocationCount, getPrefectureCount, getTipCount } from "@/lib/locations/locationService";
import { getFeaturedGuides, getGuidesBySeason } from "@/lib/guides/guideService";
import { getLandingPageContent } from "@/lib/sanity/contentService";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { urlFor } from "@/sanity/image";
import { getCurrentSeason, getCurrentMonth, seasonToSanityBestSeason, getActiveSeasonalHighlight } from "@/lib/utils/seasonUtils";
import { getActiveMicroseason } from "@/lib/utils/microseasonCalendar";

async function getIsFreePromo(): Promise<boolean> {
  if (process.env.NEXT_PUBLIC_FREE_FULL_ACCESS !== "true") return false;
  try {
    const supabase = getServiceRoleClient();
    const { data } = await supabase
      .from("launch_pricing")
      .select("remaining_slots")
      .eq("id", "default")
      .single();
    return !!data && data.remaining_slots > 0;
  } catch {
    return false;
  }
}

export const metadata: Metadata = {
  title: "Yuku Japan | Routed Japan Itineraries, Day by Day",
  description: "Thousands of curated places across all 47 prefectures. Build a trip, day by day, with routing and timing handled for you.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Yuku Japan | Routed Japan Itineraries, Day by Day",
    description: "Thousands of curated places across all 47 prefectures. Build a trip, day by day, with routing and timing handled for you.",
    siteName: "Yuku Japan",
    type: "website",
    url: "/",
    images: DEFAULT_OG_IMAGES,
  },
};

export const revalidate = 3600;

export default async function Home() {
  const currentSeason = getCurrentSeason();
  const currentMonth = getCurrentMonth();
  const sanitySeason = seasonToSanityBestSeason(currentSeason);
  const activeHighlight = getActiveSeasonalHighlight();
  const activeMicroseason = getActiveMicroseason();

  const [featuredLocations, locationCount, prefectureCount, tipCount, featuredGuides, landingContent, seasonalGuides, seasonalLocations, isFreePromo] =
    await Promise.all([
      fetchTopRatedLocations({ limit: 8 }),
      getLocationCount(),
      getPrefectureCount(),
      getTipCount(),
      getFeaturedGuides(3),
      getLandingPageContent(),
      getGuidesBySeason(sanitySeason, 3),
      fetchSeasonalLocations(currentMonth, 6, { regions: activeHighlight?.regions }),
      getIsFreePromo(),
    ]);

  // Preload LCP hero image — browser starts fetching before parsing full DOM
  const heroImage = landingContent?.heroImage;
  const lcpImageUrl = heroImage
    ? urlFor(heroImage).width(1920).quality(85).url()
    : "/images/fallback.jpg";

  return (
    <>
      <link rel="preload" as="image" href={lcpImageUrl} />
      {/*
       * Lenis smooth-scroll is mounted only on the landing page. The lerp
       * pass smooths the parallax-heavy hero/showcase composition; on
       * every other route it surfaces as the "scroll feels detached"
       * symptom (KOK-34), so global mounting is intentionally avoided.
       */}
      <LenisProvider>
        <main className="flex flex-col">
          <HeroOpening
            locationCount={locationCount}
            content={landingContent ?? undefined}
            isFreePromo={isFreePromo}
          />
          <Philosophy
            locationCount={locationCount}
            prefectureCount={prefectureCount}
            tipCount={tipCount}
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
              highlight={activeHighlight}
              microseason={activeMicroseason}
              guides={seasonalGuides}
              experiences={[]}
              locations={seasonalLocations}
              content={landingContent ?? undefined}
            />
          </ErrorBoundary>
          <ErrorBoundary fallback={null}>
            <TestimonialTheater content={landingContent ?? undefined} />
          </ErrorBoundary>
          <ErrorBoundary fallback={null}>
            <FeaturedGuides
              guides={featuredGuides}
              content={landingContent ?? undefined}
            />
          </ErrorBoundary>
          <ErrorBoundary fallback={null}>
            <AskYukuPreview />
          </ErrorBoundary>
          <ErrorBoundary fallback={null}>
            <FinalCTA content={landingContent ?? undefined} isFreePromo={isFreePromo} />
          </ErrorBoundary>
        </main>
      </LenisProvider>
    </>
  );
}
