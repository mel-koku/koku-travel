import { NextResponse } from "next/server";

import { MOCK_LOCATIONS } from "@/data/mockLocations";
import { fetchLocationDetails } from "@/lib/googlePlaces";
import type { Location } from "@/types/location";

const locationsById = new Map<string, Location>(MOCK_LOCATIONS.map((location) => [location.id, location]));

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const location = locationsById.get(id);
  if (!location) {
    return NextResponse.json(
      {
        error: "Location not found",
      },
      { status: 404 },
    );
  }

  try {
    const details = await fetchLocationDetails(location);

    return NextResponse.json(
      {
        location,
        details,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=900, s-maxage=900, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    console.error(`Failed to fetch Google Places details for ${location.name}`, error);
    const message = error instanceof Error ? error.message : "Failed to load location details.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}

