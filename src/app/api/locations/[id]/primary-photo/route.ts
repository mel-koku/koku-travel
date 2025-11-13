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
    const [photo] = details.photos ?? [];

    return NextResponse.json(
      {
        placeId: details.placeId,
        fetchedAt: details.fetchedAt,
        photo: photo ?? null,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=900, s-maxage=900, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load location photo.";
    if (process.env.NODE_ENV !== "production") {
      console.error(`Failed to fetch Google Places primary photo for ${location.name}`, error);
    }

    const status = message.includes("Missing Google Places API key") ? 503 : 500;

    return NextResponse.json(
      {
        error: message,
      },
      { status },
    );
  }
}


