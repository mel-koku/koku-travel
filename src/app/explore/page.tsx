import type { Metadata } from "next";

import { ExploreShell } from "@/components/features/explore/ExploreShell";

export const metadata: Metadata = {
  title: "Explore Japan – Koku",
};

export default function ExplorePage() {
  return <ExploreShell />;
}

