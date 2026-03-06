import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createBooking, getUserBookings } from "@/lib/bookings/bookingService";
import { calculatePrice } from "@/lib/bookings/pricingService";
import { getPersonBySlug } from "@/lib/people/peopleService";
import {
  sendBookingConfirmation,
  sendBookingNotification,
} from "@/lib/email/bookingEmails";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
} from "@/lib/api/middleware";
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
export async function POST(request: NextRequest) {
  const context = createRequestContext(request);

  const rateLimitResponse = await checkRateLimit(request, {
    maxRequests: 10,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return addRequestContextHeaders(
      NextResponse.json({ error: "Authentication required" }, { status: 401 }),
      context
    );
  }

  let body: z.infer<typeof createBookingSchema>;
  try {
    const raw = await request.json();
    body = createBookingSchema.parse(raw);
  } catch (err) {
    return addRequestContextHeaders(
      NextResponse.json(
        {
          error:
            err instanceof z.ZodError
              ? err.errors.map((e) => e.message).join(", ")
              : "Invalid request body",
        },
        { status: 400 }
      ),
      context
    );
  }

  // Validate booking date is in the future
  const today = new Date().toISOString().slice(0, 10);
  if (body.bookingDate <= today) {
    return addRequestContextHeaders(
      NextResponse.json(
        { error: "Booking date must be in the future" },
        { status: 400 }
      ),
      context
    );
  }

  // Calculate price if pricing exists
  const priceResult = await calculatePrice(
    body.personId,
    body.groupSize,
    body.experienceSlug,
    body.bookingDate
  );

  const result = await createBooking({
    personId: body.personId,
    userId: user.id,
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
    return addRequestContextHeaders(
      NextResponse.json({ error: result.error }, { status: 409 }),
      context
    );
  }

  // Send emails async (non-blocking)
  const person = await getPersonBySlug(body.personSlug).catch(() => null);
  const emailData = {
    bookingId: result.booking.id,
    personName: person?.name ?? "Unknown",
    personType: person?.type ?? "guide",
    userEmail: user.email ?? "",
    bookingDate: body.bookingDate,
    session: body.session,
    groupSize: body.groupSize,
    totalPrice: priceResult?.totalPrice,
    currency: priceResult?.currency ?? "JPY",
  };

  sendBookingConfirmation(emailData).catch((err) =>
    logger.error("Booking confirmation email failed", err)
  );
  sendBookingNotification(emailData).catch((err) =>
    logger.error("Booking notification email failed", err)
  );

  return addRequestContextHeaders(
    NextResponse.json(
      { booking: result.booking, price: priceResult },
      { status: 201 }
    ),
    context
  );
}

/**
 * GET /api/bookings — List current user's bookings
 */
export async function GET(request: NextRequest) {
  const context = createRequestContext(request);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return addRequestContextHeaders(
      NextResponse.json({ error: "Authentication required" }, { status: 401 }),
      context
    );
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") as
    | "confirmed"
    | "completed"
    | "cancelled"
    | "no_show"
    | null;
  const upcoming = url.searchParams.get("upcoming") === "true";

  const bookings = await getUserBookings(user.id, {
    status: status ?? undefined,
    upcoming: upcoming || undefined,
  });

  return addRequestContextHeaders(
    NextResponse.json({ bookings }),
    context
  );
}
