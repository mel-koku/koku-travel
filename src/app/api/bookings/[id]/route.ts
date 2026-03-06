import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { cancelBooking } from "@/lib/bookings/bookingService";
import { sendBookingCancellation } from "@/lib/email/bookingEmails";
import {
  createRequestContext,
  addRequestContextHeaders,
} from "@/lib/api/middleware";
import { logger } from "@/lib/logger";

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

/**
 * PATCH /api/bookings/[id] — Cancel a booking
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = createRequestContext(request);
  const { id } = await params;

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

  let body: z.infer<typeof cancelSchema> = {};
  try {
    const raw = await request.json();
    body = cancelSchema.parse(raw);
  } catch {
    // Empty body is fine for cancellation
  }

  const result = await cancelBooking(id, user.id, body.reason);

  if ("error" in result) {
    const status = result.error === "Not authorized" ? 403 : 400;
    return addRequestContextHeaders(
      NextResponse.json({ error: result.error }, { status }),
      context
    );
  }

  // Send cancellation email async
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
      userEmail: user.email ?? "",
      bookingDate: result.booking.booking_date,
      session: result.booking.session,
      groupSize: result.booking.group_size,
    }).catch((err) =>
      logger.error("Booking cancellation email failed", err)
    );
  }

  return addRequestContextHeaders(
    NextResponse.json({ booking: result.booking }),
    context
  );
}
