import { NextRequest, NextResponse } from "next/server";
import { getPersonBySlug } from "@/lib/people/peopleService";
import { getPersonAvailability } from "@/lib/people/availabilityService";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { createRequestContext, addRequestContextHeaders } from "@/lib/api/middleware";

/**
 * GET /api/people/[slug]/availability?month=YYYY-MM
 * Returns available dates for a person in the given month.
 * Public — no auth required.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const context = createRequestContext(request);

  const rl = await checkRateLimit(request, { maxRequests: 120, windowMs: 60_000 });
  if (rl) return addRequestContextHeaders(rl, context);

  const { slug } = await params;
  const monthParam = request.nextUrl.searchParams.get("month");

  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return addRequestContextHeaders(
      NextResponse.json({ error: "month param required (YYYY-MM)" }, { status: 400 }),
      context
    );
  }

  const parts = monthParam.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);

  const person = await getPersonBySlug(slug);
  if (!person) {
    return addRequestContextHeaders(
      NextResponse.json({ error: "Person not found" }, { status: 404 }),
      context
    );
  }

  const available = await getPersonAvailability(person.id, year, month);

  return addRequestContextHeaders(
    NextResponse.json(
      { slug, month: monthParam, availableDates: available },
      {
        status: 200,
        headers: { "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600" },
      }
    ),
    context
  );
}
