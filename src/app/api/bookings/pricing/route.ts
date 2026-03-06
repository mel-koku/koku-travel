import { NextRequest, NextResponse } from "next/server";
import { calculatePrice } from "@/lib/bookings/pricingService";
import {
  createRequestContext,
  addRequestContextHeaders,
} from "@/lib/api/middleware";

/**
 * GET /api/bookings/pricing?personId=&groupSize=&experienceSlug=&date=
 * Public — returns price breakdown for display.
 */
export async function GET(request: NextRequest) {
  const context = createRequestContext(request);
  const url = new URL(request.url);

  const personId = url.searchParams.get("personId");
  const groupSize = parseInt(url.searchParams.get("groupSize") ?? "1", 10);
  const experienceSlug = url.searchParams.get("experienceSlug") ?? undefined;
  const date = url.searchParams.get("date") ?? undefined;

  if (!personId) {
    return addRequestContextHeaders(
      NextResponse.json({ error: "Missing personId" }, { status: 400 }),
      context
    );
  }

  const price = await calculatePrice(personId, groupSize, experienceSlug, date);

  return addRequestContextHeaders(
    NextResponse.json({ price }),
    context
  );
}
