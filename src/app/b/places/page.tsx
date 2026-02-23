import type { Metadata } from "next";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PlacesShellBLazy } from "@b/features/places/PlacesShellBLazy";
import { getPagesContent } from "@/lib/sanity/contentService";

export const metadata: Metadata = {
  title: "Places in Japan | Koku Travel",
  description:
    "Discover over 3,700 locations across Japan. Browse hidden gems, cultural landmarks, and local favorites on an interactive map.",
  openGraph: {
    title: "Places in Japan | Koku Travel",
    description:
      "Discover over 3,700 locations across Japan. Browse hidden gems, cultural landmarks, and local favorites on an interactive map.",
    siteName: "Koku Travel",
  },
};

export const revalidate = 3600;

export default async function PlacesBPage() {
  const content = await getPagesContent();

  return (
    <ErrorBoundary>
      <PlacesShellBLazy content={content ?? undefined} />
    </ErrorBoundary>
  );
}
