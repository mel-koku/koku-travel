import type { Metadata } from "next";

import { ItineraryClientB } from "./ItineraryClientB";
import { getPagesContent } from "@/lib/sanity/contentService";

export const metadata: Metadata = {
  title: "Your Itinerary | Koku Travel",
  description: "View and customize your personalized Japan itinerary with optimized routes, local insights, and smart recommendations.",
  openGraph: {
    title: "Your Itinerary | Koku Travel",
    description: "View and customize your personalized Japan itinerary with optimized routes, local insights, and smart recommendations.",
    siteName: "Koku Travel",
  },
};

// Force dynamic rendering since the client uses useSearchParams()
export const dynamic = "force-dynamic";

export default async function ItineraryPageB() {
  const content = await getPagesContent();

  return <ItineraryClientB content={content ?? undefined} />;
}
