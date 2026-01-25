import {
  LandingHero,
  ValuePropositionBar,
  HowItWorks,
  FeatureShowcase,
  FeaturedLocations,
  TestimonialSection,
  FinalCTA,
} from "@/components/landing";
import { fetchTopRatedLocations, getLocationCount } from "@/lib/locations/locationService";

export default async function Home() {
  // Fetch featured locations and location count server-side
  const [featuredLocations, locationCount] = await Promise.all([
    fetchTopRatedLocations({ limit: 8 }),
    getLocationCount(),
  ]);

  return (
    <main className="flex flex-col">
      <LandingHero locationCount={locationCount} />
      <ValuePropositionBar locationCount={locationCount} />
      <HowItWorks />
      <FeatureShowcase />
      <FeaturedLocations locations={featuredLocations} />
      <TestimonialSection />
      <FinalCTA />
    </main>
  );
}
