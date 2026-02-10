import {
  HeroOpening,
  Philosophy,
  ImmersiveShowcase,
  FeaturedLocations,
  TestimonialTheater,
  FeaturedGuides,
  FinalCTA,
} from "@/components/landing";
import { fetchTopRatedLocations, getLocationCount } from "@/lib/locations/locationService";
import { getFeaturedGuides } from "@/lib/guides/guideService";
import { getLandingPageContent } from "@/lib/sanity/contentService";

export const revalidate = 3600;

export default async function Home() {
  const [featuredLocations, locationCount, featuredGuides, landingContent] =
    await Promise.all([
      fetchTopRatedLocations({ limit: 8 }),
      getLocationCount(),
      getFeaturedGuides(3),
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
      <ImmersiveShowcase content={landingContent ?? undefined} />
      <FeaturedLocations
        locations={featuredLocations}
        content={landingContent ?? undefined}
      />
      <TestimonialTheater content={landingContent ?? undefined} />
      <FeaturedGuides
        guides={featuredGuides}
        content={landingContent ?? undefined}
      />
      <FinalCTA content={landingContent ?? undefined} />
    </main>
  );
}
