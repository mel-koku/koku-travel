import type { Metadata } from "next";

import { ItineraryClient } from "./ItineraryClient";
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

export default async function ItineraryPage() {
  const content = await getPagesContent();

  return <ItineraryClient content={content ?? undefined} />;
}
