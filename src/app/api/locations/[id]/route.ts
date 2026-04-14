import { NextRequest, NextResponse } from "next/server";

import type { Location, LocationDetails } from "@/types/location";
import { isValidLocationId } from "@/lib/api/validation";
import { locationIdSchema } from "@/lib/api/schemas";
import { badRequest, notFound } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { createClient } from "@/lib/supabase/server";
import { getBestSummary } from "@/lib/utils/editorialSummary";
import { normalizeOperatingHours } from "@/lib/locations/normalizeHours";

import { LOCATION_DETAIL_COLUMNS } from "@/lib/supabase/projections";

/**
 * GET /api/locations/[id]
 * Fetches location details including Google Places data for a given location ID.
 *
 * @param request - Next.js request object
 * @param props - Route props containing the location ID parameter
 * @param props.params.id - Location ID (must be a valid identifier)
 * @returns Location object with enriched details from Google Places API, or error response
 * @throws Returns 400 if location ID format is invalid
 * @throws Returns 404 if location is not found
 * @throws Returns 429 if rate limit exceeded (100 requests/minute)
 * @throws Returns 503 if Google Places API is not configured
 * @throws Returns 500 for other errors
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  return withApiHandler(
    async (_req) => {
      // Validate using both existing function and Zod schema for defense in depth
      const idValidation = locationIdSchema.safeParse(id);
      if (!idValidation.success || !isValidLocationId(id)) {
        return badRequest("Invalid location ID format", {
          errors: idValidation.success ? undefined : idValidation.error.issues,
        });
      }

      const validatedId = idValidation.data;

      // Fetch location + harvested photos in parallel.
      // `location_photos` holds up to 5 Google photo_name refs per location
      // (harvested during enrichment). Surfacing them here lights up the
      // detail/modal gallery and the per-photo attribution credit.
      const supabase = await createClient();
      const [{ data: locationData, error: dbError }, { data: photoRows }] = await Promise.all([
        supabase
          .from("locations")
          .select(LOCATION_DETAIL_COLUMNS)
          .eq("id", validatedId)
          .single(),
        supabase
          .from("location_photos")
          .select("photo_name, width_px, height_px, attribution, attribution_uri")
          .eq("location_id", validatedId)
          .eq("source", "google")
          .eq("moderation", "approved")
          .order("sort_order", { ascending: true })
          .limit(5),
      ]);

      if (dbError || !locationData) {
        return notFound("Location not found");
      }

      // Transform database row to Location type.
      // Must populate every enrichment field the UI reads — PlaceDetail
      // hydrates the server-rendered location with this response, and any
      // field we omit here gets wiped from the DOM after hydration.
      const row = locationData as unknown as Record<string, unknown>;
      const location: Location = {
        id: row.id as string,
        name: row.name as string,
        nameJapanese: (row.name_japanese as string | null) ?? undefined,
        region: row.region as string,
        city: row.city as string,
        prefecture: (row.prefecture as string | null) ?? undefined,
        planningCity: (row.planning_city as string | null) ?? undefined,
        neighborhood: (row.neighborhood as string | null) ?? undefined,
        category: row.category as string,
        image: row.image as string,
        description: (row.description as string | null) ?? undefined,
        shortDescription: (row.short_description as string | null) ?? undefined,
        editorialSummary: (row.editorial_summary as string | null) ?? undefined,
        insiderTip: (row.insider_tip as string | null) ?? undefined,
        minBudget: (row.min_budget as string | null) ?? undefined,
        estimatedDuration: (row.estimated_duration as string | null) ?? undefined,
        operatingHours: normalizeOperatingHours(row.operating_hours),
        recommendedVisit: (row.recommended_visit as Location["recommendedVisit"]) ?? undefined,
        preferredTransitModes: (row.preferred_transit_modes as Location["preferredTransitModes"]) ?? undefined,
        coordinates: (row.coordinates as Location["coordinates"]) ?? undefined,
        timezone: (row.timezone as string | null) ?? undefined,
        rating: (row.rating as number | null) ?? undefined,
        reviewCount: (row.review_count as number | null) ?? undefined,
        placeId: (row.place_id as string | null) ?? undefined,
        primaryPhotoUrl: (row.primary_photo_url as string | null) ?? undefined,
        websiteUri: (row.website_uri as string | null) ?? undefined,
        phoneNumber: (row.phone_number as string | null) ?? undefined,
        googleMapsUri: (row.google_maps_uri as string | null) ?? undefined,
        googlePrimaryType: (row.google_primary_type as string | null) ?? undefined,
        googleTypes: (row.google_types as string[] | null) ?? undefined,
        businessStatus: (row.business_status as Location["businessStatus"]) ?? undefined,
        nearestStation: (row.nearest_station as string | null) ?? undefined,
        cashOnly: (row.cash_only as boolean | null) ?? undefined,
        reservationInfo: (row.reservation_info as Location["reservationInfo"]) ?? undefined,
        tags: (row.tags as string[] | null) ?? undefined,
        accessibilityOptions: (row.accessibility_options as Location["accessibilityOptions"]) ?? undefined,
        mealOptions: (row.meal_options as Location["mealOptions"]) ?? undefined,
        serviceOptions: (row.service_options as Location["serviceOptions"]) ?? undefined,
        dietaryOptions: (row.dietary_options as Location["dietaryOptions"]) ?? undefined,
        cuisineType: (row.cuisine_type as string | null) ?? undefined,
        priceLevel: (row.price_level as Location["priceLevel"]) ?? undefined,
        goodForChildren: (row.good_for_children as boolean | null) ?? undefined,
        goodForGroups: (row.good_for_groups as boolean | null) ?? undefined,
        outdoorSeating: (row.outdoor_seating as boolean | null) ?? undefined,
        reservable: (row.reservable as boolean | null) ?? undefined,
        isHiddenGem: (row.is_hidden_gem as boolean | null) ?? undefined,
        isSeasonal: (row.is_seasonal as boolean | null) ?? undefined,
        seasonalType: (row.seasonal_type as Location["seasonalType"]) ?? undefined,
        validMonths: (row.valid_months as number[] | null) ?? undefined,
        tattooPolicy: (row.tattoo_policy as Location["tattooPolicy"]) ?? undefined,
        jtaApproved: (row.jta_approved as boolean | null) ?? undefined,
        isUnescoSite: (row.is_unesco_site as boolean | null) ?? undefined,
        parentId: (row.parent_id as string | null) ?? undefined,
        parentMode: (row.parent_mode as Location["parentMode"]) ?? undefined,
      };

      // Gallery photos — prefer harvested location_photos rows (with
      // attribution), fall back to the primary hero when the table is empty.
      type PhotoRow = {
        photo_name: string;
        width_px: number | null;
        height_px: number | null;
        attribution: string | null;
        attribution_uri: string | null;
      };
      const harvestedPhotos = ((photoRows ?? []) as PhotoRow[]).map((p) => ({
        name: p.photo_name,
        widthPx: p.width_px ?? undefined,
        heightPx: p.height_px ?? undefined,
        proxyUrl: `/api/places/photo?photoName=${encodeURIComponent(p.photo_name)}&maxWidthPx=1600`,
        attributions: p.attribution
          ? [{ displayName: p.attribution, uri: p.attribution_uri ?? undefined }]
          : [],
      }));

      const galleryPhotos = harvestedPhotos.length > 0
        ? harvestedPhotos
        : location.primaryPhotoUrl
          ? [{ name: "primary", proxyUrl: location.primaryPhotoUrl, attributions: [] }]
          : [];

      // Build LocationDetails from database data (no Google API call)
      // All data was pre-enriched during location ingestion
      const details: LocationDetails = {
        placeId: (location.placeId ?? location.id) as string,
        displayName: location.name,
        formattedAddress: `${location.city}, ${location.region}`,
        rating: location.rating,
        userRatingCount: location.reviewCount,
        editorialSummary: getBestSummary(location, location.editorialSummary),
        websiteUri: location.websiteUri,
        internationalPhoneNumber: location.phoneNumber,
        googleMapsUri: location.googleMapsUri,
        regularOpeningHours: formatOperatingHoursForDisplay(location.operatingHours ?? null),
        reviews: [],
        photos: galleryPhotos,
        fetchedAt: new Date().toISOString(),
      };

      return NextResponse.json(
        {
          location,
          details,
        },
        {
          status: 200,
          headers: {
            // Longer cache since data is from DB, not real-time API
            "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
          },
        },
      );
    },
    { rateLimit: RATE_LIMITS.LOCATIONS },
  )(request);
}

/**
 * Converts LocationOperatingHours to display-friendly string array
 */
function formatOperatingHoursForDisplay(
  hours: Location["operatingHours"] | null,
): string[] | undefined {
  if (!hours || !hours.periods || hours.periods.length === 0) {
    return undefined;
  }

  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayLabels: Record<string, string> = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
  };

  return dayOrder
    .map((day) => {
      const period = hours.periods.find((p) => p.day === day);
      if (!period) return null;
      const label = dayLabels[day] ?? day;
      return `${label}: ${period.open} – ${period.close}${period.isOvernight ? " (next day)" : ""}`;
    })
    .filter((entry): entry is string => entry !== null);
}

