import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBooking, getUserBookings } from "@/lib/bookings/bookingService";
import { calculatePrice } from "@/lib/bookings/pricingService";
import { getPersonBySlug } from "@/lib/people/peopleService";
import {
  sendBookingConfirmation,
  sendBookingNotification,
} from "@/lib/email/bookingEmails";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { logger } from "@/lib/logger";

const createBookingSchema = z.object({
  personId: z.string().uuid(),
  personSlug: z.string().min(1),
  experienceSlug: z.string().optional(),
  locationId: z.string().optional(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  session: z.enum(["morning", "afternoon"]),
  groupSize: z.number().int().min(1).max(100).default(1),
  interpreterId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * POST /api/bookings — Create a confirmed booking
 */
export const POST = withApiHandler(
  async (request: NextRequest, { user }) => {
    let body: z.infer<typeof createBookingSchema>;
    try {
      const raw = await request.json();
      body = createBookingSchema.parse(raw);
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof z.ZodError
              ? err.errors.map((e) => e.message).join(", ")
              : "Invalid request body",
        },
        { status: 400 },
      );
    }

    // Validate booking date is in the future
    const today = new Date().toISOString().slice(0, 10);
    if (body.bookingDate <= today) {
      return NextResponse.json(
        { error: "Booking date must be in the future" },
        { status: 400 },
      );
    }

    // Calculate price if pricing exists
    const priceResult = await calculatePrice(
      body.personId,
      body.groupSize,
      body.experienceSlug,
      body.bookingDate,
    );

    const result = await createBooking({
      personId: body.personId,
      userId: user!.id,
      experienceSlug: body.experienceSlug,
      locationId: body.locationId,
      bookingDate: body.bookingDate,
      session: body.session,
      groupSize: body.groupSize,
      interpreterId: body.interpreterId,
      notes: body.notes,
      totalPrice: priceResult?.totalPrice,
      currency: priceResult?.currency ?? "JPY",
      pricingRuleId: undefined,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    // Send emails async (non-blocking)
    const person = await getPersonBySlug(body.personSlug).catch(() => null);
    const emailData = {
      bookingId: result.booking.id,
      personName: person?.name ?? "Unknown",
      personType: person?.type ?? "guide",
      userEmail: user!.email ?? "",
      bookingDate: body.bookingDate,
      session: body.session,
      groupSize: body.groupSize,
      totalPrice: priceResult?.totalPrice,
      currency: priceResult?.currency ?? "JPY",
    };

    sendBookingConfirmation(emailData).catch((err) =>
      logger.error("Booking confirmation email failed", err),
    );
    sendBookingNotification(emailData).catch((err) =>
      logger.error("Booking notification email failed", err),
    );

    return NextResponse.json(
      { booking: result.booking, price: priceResult },
      { status: 201 },
    );
  },
  { rateLimit: RATE_LIMITS.BOOKINGS, requireAuth: true, requireJson: true },
);

/**
 * GET /api/bookings — List current user's bookings
 */
export const GET = withApiHandler(
  async (request: NextRequest, { user }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as
      | "confirmed"
      | "completed"
      | "cancelled"
      | "no_show"
      | null;
    const upcoming = url.searchParams.get("upcoming") === "true";

    const bookings = await getUserBookings(user!.id, {
      status: status ?? undefined,
      upcoming: upcoming || undefined,
    });

    return NextResponse.json({ bookings });
  },
  { rateLimit: RATE_LIMITS.BOOKINGS, requireAuth: true },
);
