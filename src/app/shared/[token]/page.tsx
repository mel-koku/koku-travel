import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { logger } from "@/lib/logger";
import { SharedClient } from "./SharedClient";
import { REGIONS } from "@/data/regions";
import type { Itinerary } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";

type PageProps = {
  params: Promise<{ token: string }>;
};

// Build a map of city IDs to display names
const cityIdToName: Record<string, string> = {};
for (const region of REGIONS) {
  for (const city of region.cities) {
    cityIdToName[city.id] = city.name;
  }
}

async function getSharedTrip(token: string) {
  try {
    const supabase = getServiceRoleClient();

    const { data: share, error: shareError } = await supabase
      .from("trip_shares")
      .select("id, trip_id, view_count, created_at")
      .eq("share_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (shareError || !share) return null;

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("name, itinerary, builder_data, created_at, updated_at")
      .eq("id", share.trip_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (tripError || !trip) return null;

    // Increment view count (fire-and-forget)
    supabase
      .from("trip_shares")
      .update({ view_count: share.view_count + 1 })
      .eq("id", share.id)
      .then(({ error }) => {
        if (error) {
          logger.warn("Failed to increment share view count", {
            shareId: share.id,
          });
        }
      });

    return {
      name: trip.name as string,
      itinerary: trip.itinerary as unknown as Itinerary,
      builderData: trip.builder_data as unknown as TripBuilderData,
      createdAt: trip.created_at as string,
      updatedAt: trip.updated_at as string,
      shareCreatedAt: share.created_at as string,
      viewCount: (share.view_count as number) + 1,
    };
  } catch (error) {
    logger.error("Error fetching shared trip", error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const trip = await getSharedTrip(token);

  if (!trip) {
    return {
      title: "Shared Itinerary - Koku Travel",
    };
  }

  const itinerary = trip.itinerary as { days?: Array<{ cityId?: string }> };
  const dayCount = itinerary.days?.length ?? 0;
  const cities = [
    ...new Set(
      (itinerary.days ?? [])
        .map((d) => d.cityId)
        .filter(Boolean)
        .map((id) => cityIdToName[id!] ?? id),
    ),
  ];

  const cityList = cities.length > 0 ? cities.join(", ") : "Japan";
  const description = `${dayCount}-day itinerary for ${cityList}. Shared via Koku Travel.`;

  return {
    title: `${trip.name} - Koku Travel`,
    description,
    openGraph: {
      title: trip.name,
      description,
      siteName: "Koku Travel",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: trip.name,
      description,
    },
  };
}

export default async function SharedItineraryPage({ params }: PageProps) {
  const { token } = await params;
  const trip = await getSharedTrip(token);

  if (!trip) {
    notFound();
  }

  return <SharedClient trip={trip} />;
}
