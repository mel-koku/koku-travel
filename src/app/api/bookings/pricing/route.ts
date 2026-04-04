import { NextRequest, NextResponse } from "next/server";
import { calculatePrice } from "@/lib/bookings/pricingService";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { badRequest } from "@/lib/api/errors";

/**
 * GET /api/bookings/pricing?personId=&groupSize=&experienceSlug=&date=
 * Public — returns price breakdown for display.
 */
export const GET = withApiHandler(
  async (request: NextRequest) => {
    const url = new URL(request.url);

    const personId = url.searchParams.get("personId");
    const groupSize = parseInt(url.searchParams.get("groupSize") ?? "1", 10);
    const experienceSlug = url.searchParams.get("experienceSlug") ?? undefined;
    const date = url.searchParams.get("date") ?? undefined;

    if (!personId) {
      return badRequest("Missing personId");
    }

    const price = await calculatePrice(personId, groupSize, experienceSlug, date);

    return NextResponse.json({ price });
  },
  { rateLimit: RATE_LIMITS.BOOKINGS },
);
