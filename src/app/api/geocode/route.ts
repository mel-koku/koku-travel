import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/geocode?q=apa+hotel+kobe
 *
 * Proxies to Nominatim (OpenStreetMap) for free geocoding with POI support.
 * Server-side to set proper User-Agent header (forbidden in browser Fetch API).
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 3) {
    return NextResponse.json([]);
  }

  const params = new URLSearchParams({
    q,
    format: "json",
    countrycodes: "jp",
    limit: "5",
    "accept-language": "en",
  });

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          "User-Agent": "KokuTravel/1.0 (https://kokutravel.com)",
        },
        next: { revalidate: 300 },
      },
    );

    if (!response.ok) {
      return NextResponse.json([]);
    }

    const results = await response.json();
    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
