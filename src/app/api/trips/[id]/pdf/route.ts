import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { createClient } from "@/lib/supabase/server";
import { fetchTripById } from "@/services/sync/tripSync";
import { badRequest, notFound } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { signPrintToken } from "@/lib/pdf/printToken";
import { getBrowser } from "@/lib/pdf/browser";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/trips/[id]/pdf
 *
 * Server-side PDF generation. Launches a headless Chromium singleton,
 * navigates it to our own /print/trip/[id]/pdf route (authenticated via
 * short-lived HMAC token — Chromium can't carry session cookies), runs
 * page.pdf(), streams the buffer back.
 *
 * SELF-INVOCATION NOTE: Chromium makes an outbound HTTP request to our
 * own origin. On Vercel this spawns a second serverless function
 * invocation waiting on the first. Expected behavior, not a bug. The
 * 45s page.goto timeout is the only protection against the inner
 * invocation hanging.
 *
 * On any failure the client (DownloadBookButton) falls back to opening
 * /print/trip/[id] in a new tab for browser-native window.print().
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const { id: tripId } = await props.params;
  return withApiHandler(
    async (_req, { context, user }) => {
      const startedAt = Date.now();

      if (!process.env.PDF_TOKEN_SECRET) {
        return NextResponse.json(
          { error: "PDF generation is not configured" },
          { status: 503 },
        );
      }

      if (!tripId) {
        return badRequest("Missing trip id", undefined, { requestId: context.requestId });
      }

      const supabase = await createClient();
      const result = await fetchTripById(supabase, user!.id, tripId);
      if (!result.success || !result.data) {
        return notFound("Trip not found", { requestId: context.requestId });
      }
      const trip = result.data;

      const token = signPrintToken(trip.id, user!.id);

      const origin = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_BASE_URL ?? request.nextUrl.origin;

      const printUrl = `${origin}/print/trip/${encodeURIComponent(trip.id)}/pdf?token=${encodeURIComponent(token)}`;

      const browser = await getBrowser();
      const page = await browser.newPage();

      try {
        const response = await page.goto(printUrl, {
          waitUntil: "networkidle0",
          timeout: 45_000,
        });

        if (!response || !response.ok()) {
          throw new Error(
            `print route returned ${response?.status() ?? "no response"}`,
          );
        }

        await page.evaluateHandle(() => document.fonts.ready);

        const pdf = await page.pdf({
          preferCSSPageSize: true,
          printBackground: true,
        });

        const filename = `yuku-${slugify(trip.name)}.pdf`;

        logger.info("[pdf] rendered", {
          tripId: trip.id,
          durationMs: Date.now() - startedAt,
          bytes: pdf.length,
          requestId: context.requestId,
        });

        return new NextResponse(pdf as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "private, no-store",
          },
        });
      } finally {
        await page.close().catch(() => {});
      }
    },
    { rateLimit: RATE_LIMITS.PDF, requireAuth: true },
  )(request);
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "itinerary"
  );
}
