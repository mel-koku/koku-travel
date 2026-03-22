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
  title: "Koku Travel | Plan Your Trip to Japan",
  description: "6,000+ curated places across Japan. Build a trip, day by day, with routing and timing handled for you.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Koku Travel | Plan Your Trip to Japan",
    description: "6,000+ curated places across Japan. Build a trip, day by day, with routing and timing handled for you.",
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
        {/* Typographic break: a breath between content and social proof */}
        <section aria-label="Statement" className="relative bg-background">
          <div className="texture-grain pointer-events-none absolute inset-0" />
          <div className="relative flex min-h-[50vh] items-center justify-center px-6 py-24 text-center sm:min-h-[60vh] sm:py-32">
            <p className="mx-auto max-w-3xl font-serif text-2xl leading-snug tracking-heading text-foreground sm:text-3xl">
              Every trip starts somewhere you didn&apos;t expect.
            </p>
          </div>
        </section>
        <ErrorBoundary fallback={null}>
          <TestimonialTheater content={landingContent ?? undefined} />
        </ErrorBoundary>
        <ErrorBoundary fallback={null}>
          <FeaturedGuides
            guides={featuredGuides}
            content={landingContent ?? undefined}
          />
        </ErrorBoundary>
        {/* Ask Koku preview: demonstrate AI chat capability */}
        <section aria-label="Ask Koku" className="bg-canvas py-12 sm:py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center">
              <p className="eyebrow-mono">Ask Koku</p>
              <h2 className="mx-auto mt-4 max-w-xl font-serif text-2xl leading-snug tracking-heading text-foreground sm:text-3xl">
                Questions? We know the answer. Or we&apos;ll find it.
              </h2>
            </div>
            <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-3">
              {[
                { q: "Best ramen near Shinjuku station?", a: "Fuunji, 3-minute walk from the south exit. Get the tsukemen." },
                { q: "Day trip from Osaka worth taking?", a: "Nara. 45 minutes by train, deer park, Todai-ji temple. Back by dinner." },
                { q: "Cherry blossoms in Hokkaido, when?", a: "Early to mid-May. About a month after Tokyo peaks." },
              ].map((chat) => (
                <div key={chat.q} className="rounded-xl border border-border/50 bg-surface p-5">
                  <p className="text-sm font-medium text-foreground">{chat.q}</p>
                  <p className="mt-3 text-sm text-foreground-secondary">{chat.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <ErrorBoundary fallback={null}>
          <FinalCTA content={landingContent ?? undefined} />
        </ErrorBoundary>
      </main>
    </>
  );
}
