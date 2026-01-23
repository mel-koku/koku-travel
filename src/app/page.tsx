import {
  LandingHero,
  ValuePropositionBar,
  HowItWorks,
  FeatureShowcase,
  FeaturedLocations,
  TestimonialSection,
  FinalCTA,
} from "@/components/landing";
import { fetchTopRatedLocations } from "@/lib/locations/locationService";

// Location count based on CLAUDE.md stats
const LOCATION_COUNT = 2586;

export default async function Home() {
  // Fetch featured locations server-side
  const featuredLocations = await fetchTopRatedLocations({ limit: 8 });

  return (
    <main className="flex flex-col">
      <LandingHero locationCount={LOCATION_COUNT} />
      <ValuePropositionBar />
      <HowItWorks />
      <FeatureShowcase />
      <FeaturedLocations locations={featuredLocations} />
      <TestimonialSection />
      <FinalCTA />
    </main>
  );
}
