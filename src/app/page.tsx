import {
  LandingHero,
  ValuePropositionBar,
  HowItWorks,
  FeatureShowcase,
  FeaturedGuides,
  FeaturedLocations,
  TestimonialSection,
  FinalCTA,
} from "@/components/landing";
import { fetchTopRatedLocations, getLocationCount } from "@/lib/locations/locationService";
import { getFeaturedGuides } from "@/lib/guides/guideService";

export default async function Home() {
  // Fetch featured data server-side
  const [featuredLocations, locationCount, featuredGuides] = await Promise.all([
    fetchTopRatedLocations({ limit: 8 }),
    getLocationCount(),
    getFeaturedGuides(3),
  ]);

  return (
    <main className="flex flex-col">
      <LandingHero locationCount={locationCount} />
      <ValuePropositionBar locationCount={locationCount} />
      <HowItWorks />
      <FeatureShowcase />
      <FeaturedGuides guides={featuredGuides} />
      <FeaturedLocations locations={featuredLocations} />
      <TestimonialSection />
      <FinalCTA />
    </main>
  );
}
