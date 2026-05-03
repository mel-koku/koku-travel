import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { badRequest, internalError } from "@/lib/api/errors";
import { isValidLocationId } from "@/lib/api/validation";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { logger } from "@/lib/logger";

const REPORT_TYPES = [
  "permanently_closed",
  "wrong_hours",
  "wrong_address",
  "photo_issue",
  "inaccurate_info",
  "other",
] as const;

// Tolerates empty string for `reporter_email` (form may send "" when blank).
// Falsy → undefined; truthy → must be a valid email.
const emailSchema = z
  .union([z.string().email(), z.literal("")])
  .nullish()
  .transform((v) => (v ? v : undefined));

const reportSchema = z.object({
  location_id: z.string().refine(isValidLocationId, "Invalid location_id"),
  report_type: z.enum(REPORT_TYPES),
  description: z.string().trim().min(10).max(1000),
  reporter_email: emailSchema,
});

/**
 * POST /api/locations/report
 * Public endpoint. Captures a user-submitted wrong-info report for a location.
 * Writes to location_reports with status='pending' for manual triage.
 */
export const POST = withApiHandler(
  async (request: NextRequest, { context, user }) => {
    let body: z.infer<typeof reportSchema>;
    try {
      const raw = await request.json();
      body = reportSchema.parse(raw);
    } catch (err) {
      const message =
        err instanceof z.ZodError
          ? err.errors.map((e) => e.message).join(", ")
          : "Invalid report data";
      return badRequest(message, undefined, {
        route: "/api/locations/report",
        requestId: context.requestId,
      });
    }

    const supabase = getServiceRoleClient();

    const { data, error } = await supabase
      .from("location_reports")
      .insert({
        location_id: body.location_id,
        report_type: body.report_type,
        description: body.description,
        reporter_email: body.reporter_email ?? null,
        reporter_user_id: user?.id ?? null,
      })
      .select("id")
      .single();

    if (error || !data) {
      logger.error(
        "Failed to insert location report",
        error instanceof Error ? error : new Error(String(error)),
        {
          requestId: context.requestId,
          location_id: body.location_id,
          report_type: body.report_type,
        },
      );
      return internalError(
        "We couldn't submit your report. Please try again.",
        undefined,
        { route: "/api/locations/report", requestId: context.requestId },
      );
    }

    return NextResponse.json({ report_id: data.id }, { status: 201 });
  },
  {
    rateLimit: RATE_LIMITS.LOCATION_REPORTS,
    optionalAuth: true,
    requireJson: true,
  },
);

export const maxDuration = 10;
