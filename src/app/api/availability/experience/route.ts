import { NextResponse } from "next/server";
import { getExperienceInterpreters } from "@/lib/people/availabilityService";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";

/**
 * GET /api/availability/experience?slug=...&date=YYYY-MM-DD
 * Returns interpreters available for an experience on a given date.
 * Public — no auth required.
 */
export const GET = withApiHandler(
  async (request) => {
    const slug = request.nextUrl.searchParams.get("slug");
    const date = request.nextUrl.searchParams.get("date");

    if (!slug || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "slug and date (YYYY-MM-DD) required" }, { status: 400 });
    }

    const interpreters = await getExperienceInterpreters(slug, date);

    return NextResponse.json(
      { slug, date, interpreters },
      {
        status: 200,
        headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=120" },
      }
    );
  },
  { rateLimit: RATE_LIMITS.EXPERIENCES },
);
