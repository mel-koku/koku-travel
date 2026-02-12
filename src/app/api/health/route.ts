import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createRequestContext, addRequestContextHeaders } from "@/lib/api/middleware";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { logger } from "@/lib/logger";

/**
 * GET /api/health
 * Health check endpoint that verifies critical service dependencies
 *
 * @returns 200 with health status if all services are healthy
 * @returns 503 if any critical service is unhealthy
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const context = createRequestContext(request);

  // Rate limit: 200 req/min — generous for monitoring but prevents abuse
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 200, windowMs: 60_000 });
  if (rateLimitResponse) return addRequestContextHeaders(rateLimitResponse, context);

  const timestamp = new Date().toISOString();
  const version = process.env.npm_package_version || "unknown";

  const health: {
    status: "healthy" | "unhealthy";
    timestamp: string;
    version: string;
    uptime: number;
    requestId: string;
    services: {
      supabase: { status: "healthy" | "unhealthy"; message?: string };
    };
  } = {
    status: "healthy",
    timestamp,
    version,
    uptime: process.uptime(),
    requestId: context.requestId,
    services: {
      supabase: { status: "unhealthy" },
    },
  };

  // Check Supabase connection
  try {
    const supabase = await createSupabaseClient();
    // Simple health check query
    const { error } = await supabase.from("place_details").select("location_id").limit(1);
    if (error && error.code !== "PGRST116") {
      // PGRST116 is "no rows returned" which is fine for health check
      throw error;
    }
    health.services.supabase = { status: "healthy" };
  } catch (error) {
    logger.error("Supabase health check failed", error instanceof Error ? error : new Error(String(error)), {
      requestId: context.requestId,
    });
    health.services.supabase = {
      status: "unhealthy",
      message: error instanceof Error ? error.message : String(error),
    };
    health.status = "unhealthy";
  }

  const responseTime = Date.now() - startTime;
  const statusCode = health.status === "healthy" ? 200 : 503;

  const response = NextResponse.json(
    {
      ...health,
      responseTime: `${responseTime}ms`,
    },
    {
      status: statusCode,
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=30",
        "Content-Type": "application/json",
      },
    },
  );

  return addRequestContextHeaders(response, context);
}
