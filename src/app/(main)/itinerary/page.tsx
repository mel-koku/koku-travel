import type { Metadata } from "next";

import { ItineraryClient } from "./ItineraryClient";
import { getPagesContent } from "@/lib/sanity/contentService";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";

async function getLaunchSlots(): Promise<number | null> {
  try {
    const supabase = getServiceRoleClient();
    const { data } = await supabase
      .from("launch_pricing")
      .select("remaining_slots")
      .eq("id", "default")
      .single();
    return data?.remaining_slots ?? null;
  } catch {
    return null;
  }
}

export const metadata: Metadata = {
  title: "Your Itinerary | Yuku Japan",
  description: "View and customize your personalized Japan itinerary with optimized routes, local insights, and smart recommendations.",
  alternates: { canonical: "/itinerary" },
  openGraph: {
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
  const [content, launchSlotsRemaining] = await Promise.all([
    getPagesContent(),
    getLaunchSlots(),
  ]);

  const launchPricing = (launchSlotsRemaining ?? 0) > 0;

  return (
    <ItineraryClient
      content={content ?? undefined}
      launchPricing={launchPricing}
      launchSlotsRemaining={launchSlotsRemaining ?? undefined}
    />
  );
}
