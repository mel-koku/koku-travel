import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBookingInquiry } from "@/lib/people/peopleService";
import { getPersonBySlug } from "@/lib/people/peopleService";
import {
  sendInquiryNotification,
  sendInquiryConfirmation,
} from "@/lib/email/emailService";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { badRequest, internalError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";

const inquirySchema = z.object({
  personId: z.string().uuid(),
  personSlug: z.string().min(1),
  contactEmail: z.string().email(),
  preferredDatesStart: z.string().optional(),
  preferredDatesEnd: z.string().optional(),
  groupSize: z.number().int().min(1).max(100).optional(),
  message: z.string().max(2000).optional(),
});

/**
 * POST /api/inquiries
 * Auth required (not in PUBLIC_API_ROUTES).
 * Creates a booking inquiry and sends email notifications.
 */
export const POST = withApiHandler(
  async (request: NextRequest, { context, user }) => {
    const requestId = context.requestId;
    // Parse and validate body
    let body: z.infer<typeof inquirySchema>;
    try {
      const raw = await request.json();
      body = inquirySchema.parse(raw);
    } catch (err) {
      const message =
        err instanceof z.ZodError
          ? err.errors.map((e) => e.message).join(", ")
          : "Invalid request body";
      return badRequest(message, undefined, { requestId });
    }

    // Create the inquiry
    const result = await createBookingInquiry({
      personId: body.personId,
      userId: user!.id,
      contactEmail: body.contactEmail,
      preferredDatesStart: body.preferredDatesStart,
      preferredDatesEnd: body.preferredDatesEnd,
      groupSize: body.groupSize,
      message: body.message,
    });

    if (!result) {
      return internalError("Failed to create inquiry", undefined, { requestId });
    }

    // Fire emails async (non-blocking)
    const person = await getPersonBySlug(body.personSlug).catch(() => null);
    const emailData = {
      personName: person?.name ?? "Unknown",
      personType: person?.type ?? "guide",
      userEmail: body.contactEmail,
      preferredDatesStart: body.preferredDatesStart,
      preferredDatesEnd: body.preferredDatesEnd,
      groupSize: body.groupSize,
      message: body.message,
    };

    sendInquiryNotification(emailData).catch((err) =>
      logger.error("Inquiry notification email failed", err),
    );
    sendInquiryConfirmation(emailData).catch((err) =>
      logger.error("Inquiry confirmation email failed", err),
    );

    return NextResponse.json({ id: result.id }, { status: 201 });
  },
  { rateLimit: RATE_LIMITS.INQUIRIES, requireAuth: true, requireJson: true },
);
