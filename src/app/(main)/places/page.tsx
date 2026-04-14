import type { Metadata } from "next";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PlacesShellLazy } from "@/components/features/places/PlacesShellLazy";
import { getPagesContent } from "@/lib/sanity/contentService";
import { DEFAULT_OG_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/seo/defaults";

const PLACES_DESCRIPTION =
  "Over 6,000 locations across Japan. Cultural landmarks, neighborhood favorites, and an interactive map.";

export const metadata: Metadata = {
  title: "Places in Japan | Yuku Japan",
  description: PLACES_DESCRIPTION,
  alternates: {
    canonical: "/places",
  },
  openGraph: {
    images: DEFAULT_OG_IMAGES,
    title: "Places in Japan | Yuku Japan",
    description: PLACES_DESCRIPTION,
    url: "/places",
    siteName: "Yuku Japan",
    type: "website",
  },
  twitter: {
    images: DEFAULT_TWITTER_IMAGES,
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
