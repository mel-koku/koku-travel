import type { Metadata } from "next";

import { getTripBuilderConfig } from "@/lib/sanity/contentService";
import TripBuilderClient from "./TripBuilderClient";

export const metadata: Metadata = {
  title: "Trip Builder | Koku Travel",
  description: "Build your personalized Japan itinerary. Choose your dates, entry point, travel vibes, and regions to create the perfect trip.",
  openGraph: {
    title: "Trip Builder | Koku Travel",
    description: "Build your personalized Japan itinerary. Choose your dates, entry point, travel vibes, and regions to create the perfect trip.",
    siteName: "Koku Travel",
  },
};

export const revalidate = 3600;

export default async function TripBuilderPage() {
  const sanityConfig = await getTripBuilderConfig();

  return <TripBuilderClient sanityConfig={sanityConfig ?? undefined} />;
}
