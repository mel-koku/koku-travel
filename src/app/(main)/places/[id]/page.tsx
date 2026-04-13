import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PlaceDetail } from "@/components/features/places/PlaceDetail";
import { buildPlaceJsonLd } from "@/lib/places/placeJsonLd";
import { buildBreadcrumbList, buildJsonLdGraph } from "@/lib/seo/breadcrumbs";
import { serializeJsonLd } from "@/lib/seo/jsonLd";
import type { Location } from "@/types/location";
import { normalizeOperatingHours } from "@/lib/locations/normalizeHours";
import { LOCATION_DETAIL_COLUMNS } from "@/lib/supabase/projections";

export const revalidate = 3600;

type RouteProps = {
  params: Promise<{ id: string }>;
};

async function fetchLocation(id: string): Promise<Location | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locations")
    .select(LOCATION_DETAIL_COLUMNS)
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
    planningCity: row.planning_city ?? undefined,
    neighborhood: row.neighborhood ?? undefined,
    category: row.category,
    image: row.image,
    description: row.description ?? undefined,
    shortDescription: row.short_description ?? undefined,
    editorialSummary: row.editorial_summary ?? undefined,
    insiderTip: row.insider_tip ?? undefined,
    rating: row.rating ?? undefined,
    reviewCount: row.review_count ?? undefined,
    estimatedDuration: row.estimated_duration ?? undefined,
    minBudget: row.min_budget ?? undefined,
    operatingHours: normalizeOperatingHours(row.operating_hours),
    recommendedVisit: row.recommended_visit ?? undefined,
    coordinates: row.coordinates ?? undefined,
    timezone: row.timezone ?? undefined,
    placeId: row.place_id ?? undefined,
    primaryPhotoUrl: row.primary_photo_url ?? undefined,
    websiteUri: row.website_uri ?? undefined,
    phoneNumber: row.phone_number ?? undefined,
    googleMapsUri: row.google_maps_uri ?? undefined,
    googlePrimaryType: row.google_primary_type ?? undefined,
    googleTypes: row.google_types ?? undefined,
    businessStatus: row.business_status ?? undefined,
    preferredTransitModes: row.preferred_transit_modes ?? undefined,
    nearestStation: row.nearest_station ?? undefined,
    cashOnly: row.cash_only ?? undefined,
    reservationInfo: row.reservation_info ?? undefined,
    tags: row.tags ?? undefined,
    accessibilityOptions: row.accessibility_options ?? undefined,
    mealOptions: row.meal_options ?? undefined,
    serviceOptions: row.service_options ?? undefined,
    dietaryOptions: row.dietary_options ?? undefined,
    cuisineType: row.cuisine_type ?? undefined,
    priceLevel: row.price_level ?? undefined,
    goodForChildren: row.good_for_children ?? undefined,
    goodForGroups: row.good_for_groups ?? undefined,
    outdoorSeating: row.outdoor_seating ?? undefined,
    reservable: row.reservable ?? undefined,
    isHiddenGem: row.is_hidden_gem ?? undefined,
    isSeasonal: row.is_seasonal ?? undefined,
    seasonalType: row.seasonal_type ?? undefined,
    validMonths: row.valid_months ?? undefined,
    tattooPolicy: row.tattoo_policy ?? undefined,
    jtaApproved: row.jta_approved ?? undefined,
    isUnescoSite: row.is_unesco_site ?? undefined,
    parentId: row.parent_id ?? undefined,
    parentMode: row.parent_mode ?? undefined,
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
    title: `${location.name} | ${location.city} | Yuku Japan`,
    description,
    alternates: {
      canonical: `/places/${id}`,
    },
    openGraph: {
      title: `${location.name} | ${location.city}`,
      description,
      images: location.primaryPhotoUrl
        ? [{ url: location.primaryPhotoUrl, width: 1200, height: 630 }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${location.name} | ${location.city}`,
      description,
    },
  };
}

export default async function PlaceDetailPage({ params }: RouteProps) {
  const { id } = await params;
  const location = await fetchLocation(id);

  if (!location) notFound();

  const placeSchema = buildPlaceJsonLd(location);
  const breadcrumbs = buildBreadcrumbList([
    { name: "Home", path: "/" },
    { name: "Places", path: "/places" },
    { name: location.name, path: `/places/${id}` },
  ]);
  const jsonLd = buildJsonLdGraph(placeSchema, breadcrumbs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <PlaceDetail initialLocation={location} />
    </>
  );
}
