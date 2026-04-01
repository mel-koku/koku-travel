import type { Metadata } from "next";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PlacesShellLazy } from "@/components/features/places/PlacesShellLazy";
import { getPagesContent } from "@/lib/sanity/contentService";

export const metadata: Metadata = {
  title: "Places in Japan | Koku Travel",
  description: "Over 6,000 locations across Japan. Cultural landmarks, neighborhood favorites, and an interactive map.",
  alternates: {
    canonical: "/places",
  },
  openGraph: {
    title: "Places in Japan | Koku Travel",
    description: "Over 6,000 locations across Japan. Cultural landmarks, neighborhood favorites, and an interactive map.",
    siteName: "Koku Travel",
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
