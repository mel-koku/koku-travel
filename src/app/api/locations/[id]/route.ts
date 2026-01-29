import { NextRequest, NextResponse } from "next/server";

import type { Location, LocationDetails } from "@/types/location";
import { isValidLocationId } from "@/lib/api/validation";
import { locationIdSchema } from "@/lib/api/schemas";
import { badRequest, notFound } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { getBestSummary } from "@/lib/utils/editorialSummary";

/**
 * Columns needed for location detail API endpoint
 * Includes all enrichment fields for building LocationDetails without Google API call
 */
const LOCATION_DETAIL_API_COLUMNS = `
  id,
  name,
  region,
  city,
  category,
  image,
  description,
  short_description,
  rating,
  review_count,
  estimated_duration,
  min_budget,
  operating_hours,
  recommended_visit,
  coordinates,
  timezone,
  place_id,
  preferred_transit_modes,
  primary_photo_url,
  editorial_summary
`.replace(/\s+/g, "");

/**
 * Database row type for location detail endpoint
 */
type LocationDetailApiRow = {
  id: string;
  name: string;
  region: string;
  city: string;
  category: string;
  image: string;
  description: string | null;
  short_description: string | null;
  rating: number | null;
  review_count: number | null;
  estimated_duration: string | null;
  min_budget: string | null;
  operating_hours: Location["operatingHours"] | null;
  recommended_visit: Location["recommendedVisit"] | null;
  coordinates: { lat: number; lng: number } | null;
  timezone: string | null;
  place_id: string | null;
  preferred_transit_modes: Location["preferredTransitModes"] | null;
  primary_photo_url: string | null;
  editorial_summary: string | null;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * GET /api/locations/[id]
 * Fetches location details including Google Places data for a given location ID.
 *
 * @param request - Next.js request object
 * @param context - Route context containing the location ID parameter
 * @param context.params.id - Location ID (must be a valid identifier)
 * @returns Location object with enriched details from Google Places API, or error response
 * @throws Returns 400 if location ID format is invalid
 * @throws Returns 404 if location is not found
 * @throws Returns 429 if rate limit exceeded (100 requests/minute)
 * @throws Returns 503 if Google Places API is not configured
 * @throws Returns 500 for other errors
 */
export async function GET(request: NextRequest, context: RouteContext) {
  // Rate limiting: 100 requests per minute per IP
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 100, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { id } = await context.params;

  // Validate using both existing function and Zod schema for defense in depth
  const idValidation = locationIdSchema.safeParse(id);
  if (!idValidation.success || !isValidLocationId(id)) {
    return badRequest("Invalid location ID format", {
      errors: idValidation.success ? undefined : idValidation.error.issues,
    });
  }

  const validatedId = idValidation.data;

  // Fetch location from database with all enrichment fields
  const supabase = await createClient();
  const { data: locationData, error: dbError } = await supabase
    .from("locations")
    .select(LOCATION_DETAIL_API_COLUMNS)
    .eq("id", validatedId)
    .single();

  if (dbError || !locationData) {
    return notFound("Location not found");
  }

  // Transform database row to Location type
  const row = locationData as unknown as LocationDetailApiRow;
  const location: Location = {
    id: row.id,
    name: row.name,
    region: row.region,
    city: row.city,
    category: row.category,
    image: row.image,
    description: row.description ?? undefined,
    minBudget: row.min_budget ?? undefined,
    estimatedDuration: row.estimated_duration ?? undefined,
    operatingHours: row.operating_hours ?? undefined,
    recommendedVisit: row.recommended_visit ?? undefined,
    preferredTransitModes: row.preferred_transit_modes ?? undefined,
    coordinates: row.coordinates ?? undefined,
    timezone: row.timezone ?? undefined,
    shortDescription: row.short_description ?? undefined,
    rating: row.rating ?? undefined,
    reviewCount: row.review_count ?? undefined,
    placeId: row.place_id ?? undefined,
    primaryPhotoUrl: row.primary_photo_url ?? undefined,
    editorialSummary: row.editorial_summary ?? undefined,
  };

  // Build LocationDetails from database data (no Google API call)
  // All data was pre-enriched during location ingestion
  const details: LocationDetails = {
    placeId: row.place_id ?? row.id,
    displayName: row.name,
    formattedAddress: `${row.city}, ${row.region}`,
    rating: row.rating ?? undefined,
    userRatingCount: row.review_count ?? undefined,
    editorialSummary: getBestSummary(location, row.editorial_summary ?? undefined),
    regularOpeningHours: formatOperatingHoursForDisplay(row.operating_hours),
    reviews: [], // Reviews removed to reduce API costs
    photos: row.primary_photo_url
      ? [{ name: "primary", proxyUrl: row.primary_photo_url, attributions: [] }]
      : [],
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

