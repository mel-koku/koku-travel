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

export default async function Home() {
  // Fetch featured data server-side
  const [featuredLocations, locationCount, featuredGuides] = await Promise.all([
    fetchTopRatedLocations({ limit: 8 }),
    getLocationCount(),
    getFeaturedGuides(3),
  ]);

  return (
    <main className="flex flex-col">
      <HeroOpening locationCount={locationCount} />
      <Philosophy locationCount={locationCount} />
      <ImmersiveShowcase />
      <FeaturedLocations locations={featuredLocations} />
      <TestimonialTheater />
      <FeaturedGuides guides={featuredGuides} />
      <FinalCTA />
    </main>
  );
}
