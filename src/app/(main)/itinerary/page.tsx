import type { Metadata } from "next";

import { ItineraryClient } from "./ItineraryClient";
import { getPagesContent } from "@/lib/sanity/contentService";
import { DEFAULT_OG_IMAGES } from "@/lib/seo/defaults";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";

async function getLaunchPricingActive(): Promise<boolean> {
  try {
    const supabase = getServiceRoleClient();
    const { data } = await supabase
      .from("launch_pricing")
      .select("remaining_slots")
      .eq("id", "default")
      .single();
    return !!data && data.remaining_slots > 0;
  } catch {
    return false;
  }
}

export const metadata: Metadata = {
  title: "Your Itinerary | Yuku Japan",
  description: "Your routed Japan itinerary, day by day. Real transit times, daily briefings, and editorial picks for each city.",
  alternates: { canonical: "/itinerary" },
  openGraph: {
    images: DEFAULT_OG_IMAGES,
    title: "Your Itinerary | Yuku Japan",
    description: "Your routed Japan itinerary, day by day. Real transit times, daily briefings, and editorial picks for each city.",
    url: "/itinerary",
    siteName: "Yuku Japan",
    type: "website",
  },
  robots: { index: false, follow: true },
};

// Force dynamic rendering since the client uses useSearchParams()
export const dynamic = "force-dynamic";

export default async function ItineraryPage() {
  const [content, launchPricing] = await Promise.all([
    getPagesContent(),
    getLaunchPricingActive(),
  ]);

  return (
    <ItineraryClient
      content={content ?? undefined}
      launchPricing={launchPricing}
    />
  );
}
