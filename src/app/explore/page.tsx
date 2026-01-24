import type { Metadata } from "next";

import { ExploreShell } from "@/components/features/explore/ExploreShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getFeaturedLocations } from "@/lib/getFeaturedLocations";

export const metadata: Metadata = {
  title: "Explore Japan – Koku",
};

export default async function ExplorePage() {
  // Fetch featured locations server-side for instant carousel display
  const initialFeaturedLocations = await getFeaturedLocations();

  return (
    <ErrorBoundary>
      <ExploreShell initialFeaturedLocations={initialFeaturedLocations} />
    </ErrorBoundary>
  );
}
