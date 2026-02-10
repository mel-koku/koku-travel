import { ItineraryClient } from "./ItineraryClient";
import { getPagesContent } from "@/lib/sanity/contentService";

// Force dynamic rendering since the client uses useSearchParams()
export const dynamic = "force-dynamic";

export default async function ItineraryPage() {
  const content = await getPagesContent();

  return <ItineraryClient content={content ?? undefined} />;
}
