import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PlaceDetailB } from "@b/features/places/PlaceDetailB";
import type { Location } from "@/types/location";

export const revalidate = 3600;

const DETAIL_COLUMNS = `
  id, name, name_japanese, region, city, prefecture, category, image, description,
  short_description, rating, review_count, estimated_duration, min_budget,
  operating_hours, recommended_visit, coordinates, timezone, place_id,
  preferred_transit_modes, primary_photo_url, editorial_summary, website_uri,
  phone_number, google_maps_uri, tags, nearest_station, cash_only,
  reservation_info, is_hidden_gem
`.replace(/\s+/g, "");

type RouteProps = {
  params: Promise<{ id: string }>;
};

async function fetchLocation(id: string): Promise<Location | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locations")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const row = data as unknown as Record<string, unknown>;
  return {
    id: row.id,
    name: row.name,
    nameJapanese: row.name_japanese ?? undefined,
    region: row.region,
    city: row.city,
    prefecture: row.prefecture ?? undefined,
    category: row.category,
    image: row.image,
    description: row.description ?? undefined,
    shortDescription: row.short_description ?? undefined,
    rating: row.rating ?? undefined,
    reviewCount: row.review_count ?? undefined,
    estimatedDuration: row.estimated_duration ?? undefined,
    minBudget: row.min_budget ?? undefined,
    operatingHours: row.operating_hours ?? undefined,
    recommendedVisit: row.recommended_visit ?? undefined,
    coordinates: row.coordinates ?? undefined,
    timezone: row.timezone ?? undefined,
    placeId: row.place_id ?? undefined,
    preferredTransitModes: row.preferred_transit_modes ?? undefined,
    primaryPhotoUrl: row.primary_photo_url ?? undefined,
    editorialSummary: row.editorial_summary ?? undefined,
    websiteUri: row.website_uri ?? undefined,
    phoneNumber: row.phone_number ?? undefined,
    googleMapsUri: row.google_maps_uri ?? undefined,
    tags: row.tags ?? undefined,
    nearestStation: row.nearest_station ?? undefined,
    cashOnly: row.cash_only ?? undefined,
    reservationInfo: row.reservation_info ?? undefined,
    isHiddenGem: row.is_hidden_gem ?? undefined,
  } as Location;
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { id } = await params;
  const location = await fetchLocation(id);

  if (!location) {
    return { title: "Place not found" };
  }

  const description =
    location.shortDescription ??
    location.description?.slice(0, 160) ??
    `Discover ${location.name} in ${location.city}, Japan`;

  return {
    title: `${location.name} — ${location.city} | Koku Travel`,
    description,
    openGraph: {
      title: `${location.name} — ${location.city}`,
      description,
      images: location.primaryPhotoUrl
        ? [{ url: location.primaryPhotoUrl, width: 1200, height: 630 }]
        : undefined,
    },
  };
}

export default async function PlaceDetailPage({ params }: RouteProps) {
  const { id } = await params;
  const location = await fetchLocation(id);

  if (!location) notFound();

  return <PlaceDetailB initialLocation={location} />;
}
