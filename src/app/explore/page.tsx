import type { Metadata } from "next";

import { ExploreShell } from "@/components/features/explore/ExploreShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getPagesContent } from "@/lib/sanity/contentService";

export const metadata: Metadata = {
  title: "Explore Japan – Koku",
};

export const revalidate = 3600;

export default async function ExplorePage() {
  const content = await getPagesContent();

  return (
    <ErrorBoundary>
      <ExploreShell content={content ?? undefined} />
    </ErrorBoundary>
  );
}
