import { NextRequest, NextResponse } from "next/server";
import {
  isSlotAvailable,
  isPersonAvailableForSlot,
} from "@/lib/bookings/bookingService";
import {
  createRequestContext,
  addRequestContextHeaders,
} from "@/lib/api/middleware";

/**
 * GET /api/bookings/availability?personId=&date=&session=
 * Public — checks if a slot is bookable.
 */
export async function GET(request: NextRequest) {
  const context = createRequestContext(request);
  const url = new URL(request.url);

  const personId = url.searchParams.get("personId");
  const date = url.searchParams.get("date");
  const session = url.searchParams.get("session") as
    | "morning"
    | "afternoon"
    | null;

  if (!personId || !date || !session) {
    return addRequestContextHeaders(
      NextResponse.json(
        { error: "Missing personId, date, or session" },
        { status: 400 }
      ),
      context
    );
  }

  if (session !== "morning" && session !== "afternoon") {
    return addRequestContextHeaders(
      NextResponse.json(
        { error: "Session must be morning or afternoon" },
        { status: 400 }
      ),
      context
    );
  }

  const personAvailable = await isPersonAvailableForSlot(
    personId,
    date,
    session
  );
  if (!personAvailable) {
    return addRequestContextHeaders(
      NextResponse.json({
        available: false,
        reason: "Not available on this day/session",
      }),
      context
    );
  }

  const slotFree = await isSlotAvailable(personId, date, session);
  if (!slotFree) {
    return addRequestContextHeaders(
      NextResponse.json({
        available: false,
        reason: "Already booked",
      }),
      context
    );
  }

  return addRequestContextHeaders(
    NextResponse.json({ available: true }),
    context
  );
}
