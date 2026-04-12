import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendContactNotification } from "@/lib/email/emailService";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { badRequest } from "@/lib/api/errors";
import { logger } from "@/lib/logger";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const attachmentSchema = z.object({
  filename: z.string().min(1),
  content: z.string().min(1), // base64-encoded
  contentType: z.string().refine(
    (type) => ALLOWED_FILE_TYPES.includes(type),
    { message: "File type not allowed" }
  ),
  size: z.number().max(MAX_FILE_SIZE, "File must be under 5MB"),
});

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Valid email is required"),
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
  attachment: attachmentSchema.nullish().transform((v) => v ?? undefined),
});

export const maxDuration = 60;

/**
 * POST /api/contact
 * Public (no auth required). Rate limited to 5 per 15 minutes.
 * Sends a notification email to the team via Resend.
 */
export const POST = withApiHandler(
  async (request: NextRequest) => {
    let body: z.infer<typeof contactSchema>;
    try {
      const raw = await request.json();
      body = contactSchema.parse(raw);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return badRequest(err.errors.map((e) => e.message).join(", "));
      }
      return badRequest("Invalid request body");
    }

    const attachment = body.attachment
      ? {
          filename: body.attachment.filename,
          content: Buffer.from(body.attachment.content, "base64"),
          contentType: body.attachment.contentType,
        }
      : undefined;

    // Send email async (non-blocking to client)
    sendContactNotification({
      name: body.name,
      email: body.email,
      subject: body.subject,
      message: body.message,
      attachment,
    }).catch((err) =>
      logger.error("Contact notification email failed", err)
    );

    return NextResponse.json({ success: true });
  },
  { rateLimit: RATE_LIMITS.CONTACT, requireJson: true }
);
