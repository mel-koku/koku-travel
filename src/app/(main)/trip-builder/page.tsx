import type { Metadata } from "next";

import { getTripBuilderConfig } from "@/lib/sanity/contentService";
import TripBuilderClient from "./TripBuilderClient";
import { DEFAULT_OG_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/seo/defaults";

const TRIP_BUILDER_DESCRIPTION =
  "Build your personalized Japan itinerary. Choose your dates, entry point, travel vibes, and regions to create the perfect trip.";

export const metadata: Metadata = {
  title: "Trip Builder | Yuku Japan",
  description: TRIP_BUILDER_DESCRIPTION,
  alternates: { canonical: "/trip-builder" },
  openGraph: {
    images: DEFAULT_OG_IMAGES,
    title: "Trip Builder | Yuku Japan",
    description: TRIP_BUILDER_DESCRIPTION,
    url: "/trip-builder",
    siteName: "Yuku Japan",
    type: "website",
  },
  twitter: {
    images: DEFAULT_TWITTER_IMAGES,
    card: "summary_large_image",
    title: "Trip Builder | Yuku Japan",
    description: TRIP_BUILDER_DESCRIPTION,
  },
};

export const revalidate = 3600;

export default async function TripBuilderPage() {
  const sanityConfig = await getTripBuilderConfig();

  return <TripBuilderClient sanityConfig={sanityConfig ?? undefined} />;
}
