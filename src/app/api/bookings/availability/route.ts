import { NextRequest, NextResponse } from "next/server";
import {
  isSlotAvailable,
  isPersonAvailableForSlot,
} from "@/lib/bookings/bookingService";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";

/**
 * GET /api/bookings/availability?personId=&date=&session=
 * Public — checks if a slot is bookable.
 */
export const GET = withApiHandler(
  async (request: NextRequest) => {
    const url = new URL(request.url);

    const personId = url.searchParams.get("personId");
    const date = url.searchParams.get("date");
    const session = url.searchParams.get("session") as
      | "morning"
      | "afternoon"
      | null;

    if (!personId || !date || !session) {
      return NextResponse.json(
        { error: "Missing personId, date, or session" },
        { status: 400 },
      );
    }

    if (session !== "morning" && session !== "afternoon") {
      return NextResponse.json(
        { error: "Session must be morning or afternoon" },
        { status: 400 },
      );
    }

    const personAvailable = await isPersonAvailableForSlot(
      personId,
      date,
      session,
    );
    if (!personAvailable) {
      return NextResponse.json({
        available: false,
        reason: "Not available on this day/session",
      });
    }

    const slotFree = await isSlotAvailable(personId, date, session);
    if (!slotFree) {
      return NextResponse.json({
        available: false,
        reason: "Already booked",
      });
    }

    return NextResponse.json({ available: true });
  },
  { rateLimit: RATE_LIMITS.BOOKINGS },
);
