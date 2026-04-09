import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";

/**
 * GET /api/geocode?q=apa+hotel+kobe
 *
 * Proxies to Nominatim (OpenStreetMap) for free geocoding with POI support.
 * Server-side to set proper User-Agent header (forbidden in browser Fetch API).
 */
export const GET = withApiHandler(
  async (request: NextRequest) => {
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
            "User-Agent": "YukuJapan/1.0 (https://yukujapan.com)",
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
  },
  { rateLimit: RATE_LIMITS.GEOCODE },
);
