import type { Metadata } from "next";

import { ExploreShell } from "@/components/features/explore/ExploreShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Explore Japan – Koku",
};

export default async function ExplorePage() {
  return (
    <ErrorBoundary>
      <ExploreShell />
    </ErrorBoundary>
  );
}
