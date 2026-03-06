import { NextRequest, NextResponse } from "next/server";
import { getExperienceInterpreters } from "@/lib/people/availabilityService";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { createRequestContext, addRequestContextHeaders } from "@/lib/api/middleware";

/**
 * GET /api/availability/experience?slug=...&date=YYYY-MM-DD
 * Returns interpreters available for an experience on a given date.
 * Public — no auth required.
 */
export async function GET(request: NextRequest) {
  const context = createRequestContext(request);

  const rl = await checkRateLimit(request, { maxRequests: 120, windowMs: 60_000 });
  if (rl) return addRequestContextHeaders(rl, context);

  const slug = request.nextUrl.searchParams.get("slug");
  const date = request.nextUrl.searchParams.get("date");

  if (!slug || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return addRequestContextHeaders(
      NextResponse.json({ error: "slug and date (YYYY-MM-DD) required" }, { status: 400 }),
      context
    );
  }

  const interpreters = await getExperienceInterpreters(slug, date);

  return addRequestContextHeaders(
    NextResponse.json(
      { slug, date, interpreters },
      {
        status: 200,
        headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=120" },
      }
    ),
    context
  );
}
