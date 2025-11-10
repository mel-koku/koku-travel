import type { Metadata } from "next";

import { ExploreShell } from "@/components/features/explore/ExploreShell";
import { MOCK_LOCATIONS } from "@/data/mockLocations";

export const metadata: Metadata = {
  title: "Explore Japan – Koku",
};

export default function ExplorePage() {
  return (
    <main className="min-h-screen bg-gray-50 pt-4 pb-16">
      <ExploreShell locations={MOCK_LOCATIONS} />
    </main>
  );
}

