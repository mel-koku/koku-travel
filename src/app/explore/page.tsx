import type { Metadata } from "next";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ExploreShellLazy } from "@/components/features/explore/ExploreShellLazy";
import { getPagesContent } from "@/lib/sanity/contentService";

export const metadata: Metadata = {
  title: "Explore Japan | Koku Travel",
  description: "Discover over 3,700 locations across Japan. Browse hidden gems, cultural landmarks, and local favorites on an interactive map.",
  openGraph: {
    title: "Explore Japan | Koku Travel",
    description: "Discover over 3,700 locations across Japan. Browse hidden gems, cultural landmarks, and local favorites on an interactive map.",
    siteName: "Koku Travel",
  },
};

export const revalidate = 3600;

export default async function ExplorePage() {
  const content = await getPagesContent();

  return (
    <ErrorBoundary>
      <ExploreShellLazy content={content ?? undefined} />
    </ErrorBoundary>
  );
}
