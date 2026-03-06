import { NextRequest, NextResponse } from "next/server";
import { getPersonBySlug } from "@/lib/people/peopleService";
import { getPersonAvailability } from "@/lib/people/availabilityService";
import { getPersonBookedSlots } from "@/lib/bookings/bookingService";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";

/**
 * GET /api/people/[slug]/availability?month=YYYY-MM&includeBooked=true
 * Returns available dates for a person in the given month.
 * When includeBooked=true, also returns already-booked slots so the calendar
 * can grey them out.
 * Public — no auth required.
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ slug: string }> },
) {
  const { slug } = await props.params;
  return withApiHandler(
    async (req) => {
      const monthParam = req.nextUrl.searchParams.get("month");
      const includeBooked = req.nextUrl.searchParams.get("includeBooked") === "true";

      if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
        return NextResponse.json({ error: "month param required (YYYY-MM)" }, { status: 400 });
      }

      const parts = monthParam.split("-");
      const year = Number(parts[0]);
      const month = Number(parts[1]);

      const person = await getPersonBySlug(slug);
      if (!person) {
        return NextResponse.json({ error: "Person not found" }, { status: 404 });
      }

      const available = await getPersonAvailability(person.id, year, month);

      const response: Record<string, unknown> = {
        slug,
        month: monthParam,
        availableDates: available,
      };

      if (includeBooked) {
        const bookedSet = await getPersonBookedSlots(person.id, year, month);
        response.bookedSlots = Array.from(bookedSet);
      }

      return NextResponse.json(response, {
        status: 200,
        headers: {
          "Cache-Control": includeBooked
            ? "public, max-age=30, s-maxage=30, stale-while-revalidate=60"
            : "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
        },
      });
    },
    { rateLimit: RATE_LIMITS.PEOPLE },
  )(request);
}
