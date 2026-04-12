import type { Metadata } from "next";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PlacesShellLazy } from "@/components/features/places/PlacesShellLazy";
import { getPagesContent } from "@/lib/sanity/contentService";

const PLACES_DESCRIPTION =
  "Over 6,000 locations across Japan. Cultural landmarks, neighborhood favorites, and an interactive map.";

export const metadata: Metadata = {
  title: "Places in Japan | Yuku Japan",
  description: PLACES_DESCRIPTION,
  alternates: {
    canonical: "/places",
  },
  openGraph: {
    title: "Places in Japan | Yuku Japan",
    description: PLACES_DESCRIPTION,
    url: "/places",
    siteName: "Yuku Japan",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Places in Japan | Yuku Japan",
    description: PLACES_DESCRIPTION,
  },
};

export const revalidate = 3600;

export default async function PlacesPage() {
  const content = await getPagesContent();

  return (
    <ErrorBoundary>
      <PlacesShellLazy content={content ?? undefined} />
    </ErrorBoundary>
  );
}
