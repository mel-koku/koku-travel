import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { sendConciergeInquiryNotification } from "@/lib/email/emailService";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { logger } from "@/lib/logger";

const conciergeInquirySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Please enter a valid email"),
});

/**
 * POST /api/concierge/inquiries
 * Public endpoint — captures a lead from the Yuku Concierge landing page.
 * Writes to concierge_inquiries and fires a notification email (non-blocking).
 */
export const POST = withApiHandler(
  async (request: NextRequest) => {
    let body: z.infer<typeof conciergeInquirySchema>;
    try {
      const raw = await request.json();
      body = conciergeInquirySchema.parse(raw);
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

    const userAgent = request.headers.get("user-agent") ?? null;
    const supabase = getServiceRoleClient();

    const { data, error } = await supabase
      .from("concierge_inquiries")
      .insert({
        name: body.name,
        email: body.email.toLowerCase(),
        user_agent: userAgent,
      })
      .select("id, created_at")
      .single();

    if (error || !data) {
      logger.error(
        "Failed to insert concierge inquiry",
        error instanceof Error ? error : new Error(String(error)),
      );
      return NextResponse.json(
        { error: "We couldn't save your inquiry. Please try again." },
        { status: 500 },
      );
    }

    sendConciergeInquiryNotification({
      name: body.name,
      email: body.email.toLowerCase(),
      createdAt: data.created_at,
    }).catch((err) =>
      logger.error(
        "Concierge inquiry notification email failed",
        err instanceof Error ? err : new Error(String(err)),
      ),
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  },
  {
    rateLimit: RATE_LIMITS.CONCIERGE_INQUIRIES,
    requireJson: true,
  },
);
