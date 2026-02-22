import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { badRequest } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { featureFlags } from "@/lib/env/featureFlags";
import { detectPlatform } from "@/lib/video/platforms";
import { extractVideoMetadata } from "@/lib/video/metadataExtractor";
import { extractLocationFromVideo } from "@/lib/video/locationExtractor";
import { matchOrCreateLocation } from "@/lib/video/locationMatcher";

const requestSchema = z.object({
  url: z.string().url().max(2048),
});

const MAX_DAILY_IMPORTS_PER_USER = 20;

/**
 * POST /api/video-import
 *
 * Accepts a video URL, extracts metadata via oEmbed, identifies the location
 * via Gemini, then matches or creates the location in the database.
 */
export const POST = withApiHandler(
  async (request: NextRequest, { user }) => {
    // Feature flag check
    if (featureFlags.cheapMode || process.env.ENABLE_VIDEO_IMPORT === "false") {
      return badRequest("Video import is not available.");
    }

    // Parse and validate body
    const body = await request.json();
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return badRequest("Invalid URL.", { errors: validation.error.issues });
    }

    const { url } = validation.data;

    // Platform detection (before any network calls)
    const platform = detectPlatform(url);
    if (!platform) {
      return badRequest("Unsupported URL. Paste a YouTube, TikTok, or Instagram video link.");
    }

    // Daily cap for authenticated users
    if (user) {
      const overLimit = await checkDailyLimit(user.id);
      if (overLimit) {
        return NextResponse.json(
          { error: "Daily import limit reached. Try again tomorrow." },
          { status: 429 },
        );
      }
    }

    // Step 1: Extract video metadata via oEmbed
    const metadata = await extractVideoMetadata(url);
    if (!metadata) {
      return badRequest("Could not fetch video metadata. Check the URL and try again.");
    }

    // Step 2: AI location extraction via Gemini
    const extraction = await extractLocationFromVideo(metadata);
    if (!extraction) {
      return badRequest("Could not identify a location from this video.");
    }

    // Reject non-Japan content early
    if (!extraction.isInJapan) {
      return NextResponse.json({
        status: "rejected",
        reason: "This video doesn't appear to feature a location in Japan.",
        extraction: {
          locationName: extraction.locationName,
          confidence: extraction.confidence,
        },
      });
    }

    // Reject low-confidence extractions
    if (extraction.confidence === "low") {
      return NextResponse.json({
        status: "low_confidence",
        reason: "Could not confidently identify a specific location from this video.",
        extraction: {
          locationName: extraction.locationName,
          city: extraction.city,
          confidence: extraction.confidence,
          alternativeLocations: extraction.alternativeLocations,
        },
      });
    }

    // Step 3: Match or create location
    const matchResult = await matchOrCreateLocation(extraction, url);
    if (!matchResult) {
      return badRequest("Could not find or create a location. The place may not be in our coverage area.");
    }

    // Log import (non-blocking) for authenticated users
    if (user) {
      logImport(user.id, url, platform, metadata.title, matchResult.location.id).catch(
        (err) => logger.warn("[video-import] Failed to log import", { error: getErrorMessage(err) }),
      );
    }

    return NextResponse.json({
      status: "success",
      location: {
        id: matchResult.location.id,
        name: matchResult.location.name,
        city: matchResult.location.city,
        region: matchResult.location.region,
        category: matchResult.location.category,
        image: matchResult.location.image,
        primaryPhotoUrl: matchResult.location.primaryPhotoUrl,
        rating: matchResult.location.rating,
        reviewCount: matchResult.location.reviewCount,
        shortDescription: matchResult.location.shortDescription,
        coordinates: matchResult.location.coordinates,
        source: matchResult.location.source,
      },
      isNewLocation: matchResult.isNewLocation,
      matchMethod: matchResult.matchMethod,
      extraction: {
        locationName: extraction.locationName,
        locationNameJapanese: extraction.locationNameJapanese,
        city: extraction.city,
        category: extraction.category,
        confidence: extraction.confidence,
      },
      videoMetadata: {
        platform: metadata.platform,
        title: metadata.title,
        authorName: metadata.authorName,
        thumbnailUrl: metadata.thumbnailUrl,
      },
    });
  },
  {
    rateLimit: { maxRequests: 10, windowMs: 60_000 },
    optionalAuth: true,
    requireJson: true,
  },
);

/**
 * Check if user has exceeded their daily import limit.
 */
async function checkDailyLimit(userId: string): Promise<boolean> {
  try {
    // Dynamic import to avoid circular dependency issues
    const { getServiceRoleClient } = await import("@/lib/supabase/serviceRole");
    const client = getServiceRoleClient();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count, error } = await client
      .from("video_imports")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", todayStart.toISOString());

    if (error) {
      logger.warn("[checkDailyLimit] Query failed, allowing import", { error: error.message });
      return false; // fail open
    }

    return (count ?? 0) >= MAX_DAILY_IMPORTS_PER_USER;
  } catch {
    return false; // fail open if table doesn't exist yet
  }
}

/**
 * Log a video import to the tracking table (non-blocking).
 */
async function logImport(
  userId: string,
  videoUrl: string,
  platform: string,
  videoTitle: string | undefined,
  locationId: string,
): Promise<void> {
  try {
    const { getServiceRoleClient } = await import("@/lib/supabase/serviceRole");
    const client = getServiceRoleClient();

    await client.from("video_imports").upsert(
      {
        user_id: userId,
        video_url: videoUrl,
        platform,
        video_title: videoTitle?.substring(0, 500) || null,
        location_id: locationId,
        status: "completed",
      },
      { onConflict: "user_id,video_url" },
    );
  } catch (error) {
    logger.warn("[logImport] Failed to log video import", { error: getErrorMessage(error) });
  }
}
