import type { Metadata } from "next";

import { getTripBuilderConfig } from "@/lib/sanity/contentService";
import TripBuilderClientB from "./TripBuilderClientB";

export const metadata: Metadata = {
  title: "Trip Builder | Koku Travel",
  description:
    "Build your personalized Japan itinerary. Choose your dates, entry point, travel vibes, and regions to create the perfect trip.",
};

export const revalidate = 3600;

export default async function TripBuilderPageB() {
  const sanityConfig = await getTripBuilderConfig();

  return <TripBuilderClientB sanityConfig={sanityConfig ?? undefined} />;
}
