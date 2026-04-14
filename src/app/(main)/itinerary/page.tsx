import type { Metadata } from "next";

import { ItineraryClient } from "./ItineraryClient";
import { getPagesContent } from "@/lib/sanity/contentService";
import { DEFAULT_OG_IMAGES } from "@/lib/seo/defaults";

export const metadata: Metadata = {
  title: "Your Itinerary | Yuku Japan",
  description: "View and customize your personalized Japan itinerary with optimized routes, local insights, and smart recommendations.",
  alternates: { canonical: "/itinerary" },
  openGraph: {
    images: DEFAULT_OG_IMAGES,
    title: "Your Itinerary | Yuku Japan",
    description: "View and customize your personalized Japan itinerary with optimized routes, local insights, and smart recommendations.",
    url: "/itinerary",
    siteName: "Yuku Japan",
    type: "website",
  },
  robots: { index: false, follow: true },
};

// Force dynamic rendering since the client uses useSearchParams()
export const dynamic = "force-dynamic";

export default async function ItineraryPage() {
  const content = await getPagesContent();

  return <ItineraryClient content={content ?? undefined} />;
}
