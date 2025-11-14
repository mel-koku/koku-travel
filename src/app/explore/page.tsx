import type { Metadata } from "next";

import { ExploreShell } from "@/components/features/explore/ExploreShell";

export const metadata: Metadata = {
  title: "Explore Japan – Koku",
};

export default function ExplorePage() {
  return (
    <main className="min-h-screen bg-gray-50 pt-2 sm:pt-4">
      <ExploreShell />
    </main>
  );
}

