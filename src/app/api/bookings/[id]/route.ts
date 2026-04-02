import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { cancelBooking } from "@/lib/bookings/bookingService";
import { sendBookingCancellation } from "@/lib/email/bookingEmails";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { logger } from "@/lib/logger";

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

/**
 * PATCH /api/bookings/[id] — Cancel a booking
 */
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;

  const uuidResult = z.string().uuid().safeParse(id);
  if (!uuidResult.success) {
    return NextResponse.json({ error: "Invalid booking ID format" }, { status: 400 });
  }

  return withApiHandler(
    async (req, { user }) => {
      let body: z.infer<typeof cancelSchema> = {};
      try {
        const raw = await req.json();
        body = cancelSchema.parse(raw);
      } catch {
        // Empty body is fine for cancellation
      }

      const result = await cancelBooking(id, user!.id, body.reason);

      if ("error" in result) {
        const status = result.error === "Not authorized" ? 403 : 400;
        return NextResponse.json({ error: result.error }, { status });
      }

      // Send cancellation email async
      const supabase = await createClient();
      const { data: personRow } = await supabase
        .from("people")
        .select("name, type, slug")
        .eq("id", result.booking.person_id)
        .single();

      if (personRow) {
        sendBookingCancellation({
          bookingId: result.booking.id,
          personName: personRow.name,
          personType: personRow.type,
          userEmail: user!.email ?? "",
          bookingDate: result.booking.booking_date,
          session: result.booking.session,
          groupSize: result.booking.group_size,
        }).catch((err) =>
          logger.error("Booking cancellation email failed", err)
        );
      }

      return NextResponse.json({ booking: result.booking });
    },
    { rateLimit: RATE_LIMITS.BOOKINGS, requireAuth: true },
  )(request);
}
