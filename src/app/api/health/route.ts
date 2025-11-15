import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { sanityClient } from "@/lib/sanity/client";
import { env } from "@/lib/env";
import { Redis } from "@upstash/redis";

/**
 * GET /api/health
 * Health check endpoint that verifies critical service dependencies
 * 
 * @returns 200 with health status if all services are healthy
 * @returns 503 if any critical service is unhealthy
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const version = process.env.npm_package_version || "unknown";
  
  const health: {
    status: "healthy" | "unhealthy";
    timestamp: string;
    version: string;
    uptime: number;
    services: {
      supabase: { status: "healthy" | "unhealthy"; message?: string };
      sanity: { status: "healthy" | "unhealthy"; message?: string };
      upstash: { status: "healthy" | "unhealthy" | "not_configured"; message?: string };
    };
  } = {
    status: "healthy",
    timestamp,
    version,
    uptime: process.uptime(),
    services: {
      supabase: { status: "unhealthy" },
      sanity: { status: "unhealthy" },
      upstash: { status: "not_configured" },
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
    health.services.supabase = {
      status: "unhealthy",
      message: error instanceof Error ? error.message : String(error),
    };
    health.status = "unhealthy";
  }

  // Check Sanity connection
  try {
    // Simple health check query - fetch a single document
    await sanityClient.fetch(`*[_type == "guide"][0]{_id}`, {});
    health.services.sanity = { status: "healthy" };
  } catch (error) {
    health.services.sanity = {
      status: "unhealthy",
      message: error instanceof Error ? error.message : String(error),
    };
    health.status = "unhealthy";
  }

  // Check Upstash Redis (if configured)
  const upstashRedisUrl = env.upstashRedisRestUrl;
  const upstashRedisToken = env.upstashRedisRestToken;
  if (upstashRedisUrl && upstashRedisToken) {
    try {
      const redis = new Redis({
        url: upstashRedisUrl,
        token: upstashRedisToken,
      });
      // Simple ping command
      await redis.ping();
      health.services.upstash = { status: "healthy" };
    } catch (error) {
      health.services.upstash = {
        status: "unhealthy",
        message: error instanceof Error ? error.message : String(error),
      };
      // Upstash is optional, so don't mark overall status as unhealthy
    }
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

  return response;
}

