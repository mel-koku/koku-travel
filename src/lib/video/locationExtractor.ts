/**
 * AI-powered location extraction from video metadata.
 *
 * Uses Gemini (via Vercel AI SDK) to identify the specific Japan location
 * featured in a social media video based on its metadata and thumbnail.
 */

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import type { VideoMetadata } from "./metadataExtractor";

const VALID_CATEGORIES = [
  "restaurant", "nature", "landmark", "culture", "shrine", "museum",
  "park", "temple", "shopping", "garden", "onsen", "entertainment",
  "market", "wellness", "viewpoint", "bar",
] as const;

const extractionSchema = z.object({
  locationName: z.string().describe("The specific named place (e.g. 'Fushimi Inari Taisha', not 'a shrine in Kyoto')"),
  locationNameJapanese: z.string().nullable().optional().describe("Japanese name if identifiable (e.g. '伏見稲荷大社')"),
  city: z.string().describe("The city where this location is (e.g. 'Kyoto', 'Tokyo', 'Osaka')"),
  category: z.string().describe("Best-fit category: restaurant, nature, landmark, culture, shrine, museum, park, temple, shopping, garden, onsen, entertainment, market, wellness, viewpoint, or bar"),
  description: z.string().describe("One-line description of the location (keep it under 120 characters)"),
  confidence: z.string().describe("How confident: high, medium, or low"),
  isInJapan: z.boolean().describe("Whether this location is in Japan"),
  reasoning: z.string().describe("Brief explanation of how you identified this location"),
  alternativeLocations: z.array(z.object({
    name: z.string(),
    city: z.string(),
  })).nullable().optional().describe("Up to 2 alternative locations if uncertain"),
});

export type LocationExtraction = {
  locationName: string;
  locationNameJapanese?: string;
  city: string;
  category: string;
  description: string;
  confidence: "high" | "medium" | "low";
  isInJapan: boolean;
  reasoning: string;
  alternativeLocations?: { name: string; city: string }[];
};

/**
 * Extract location information from video metadata using Gemini.
 *
 * @param metadata - Video metadata from oEmbed extraction
 * @returns Extracted location data or null on failure
 */
export async function extractLocationFromVideo(
  metadata: VideoMetadata,
): Promise<LocationExtraction | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    logger.warn("[extractLocationFromVideo] GOOGLE_GENERATIVE_AI_API_KEY not set");
    return null;
  }

  const prompt = buildExtractionPrompt(metadata);

  try {
    const result = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: extractionSchema,
      prompt,
      temperature: 0.1,
    });

    const obj = result.object;

    // Normalize confidence to our expected values
    const rawConfidence = obj.confidence?.toLowerCase().trim() ?? "low";
    const confidence = (["high", "medium", "low"].includes(rawConfidence) ? rawConfidence : "low") as "high" | "medium" | "low";

    // Normalize category to valid values
    const rawCategory = obj.category?.toLowerCase().trim() ?? "landmark";
    const category = VALID_CATEGORIES.includes(rawCategory as typeof VALID_CATEGORIES[number])
      ? rawCategory as typeof VALID_CATEGORIES[number]
      : "landmark";

    return {
      ...obj,
      confidence,
      category,
      description: (obj.description ?? "").substring(0, 120),
      locationNameJapanese: obj.locationNameJapanese ?? undefined,
      alternativeLocations: obj.alternativeLocations ?? undefined,
    };
  } catch (error) {
    const msg = getErrorMessage(error);
    logger.error(
      "[extractLocationFromVideo] Gemini extraction failed",
      new Error(msg),
      { platform: metadata.platform, title: metadata.title.substring(0, 80) },
    );
    return null;
  }
}

function buildExtractionPrompt(metadata: VideoMetadata): string {
  const parts: string[] = [
    "You are a Japan travel expert. Identify the specific named location featured in this social media video.",
    "",
    "## Video Information",
    `Platform: ${metadata.platform}`,
    `Title: ${metadata.title}`,
    `Author: ${metadata.authorName}`,
  ];

  if (metadata.hashtags.length > 0) {
    parts.push(`Hashtags: ${metadata.hashtags.join(" ")}`);
  }

  if (metadata.description) {
    parts.push(`Description: ${metadata.description}`);
  }

  parts.push(
    "",
    "## Instructions",
    "1. Identify the SPECIFIC named place (a real establishment, temple, park, restaurant, etc.) — not just a generic area.",
    "2. Cross-reference the title, hashtags, and author info to narrow down the location.",
    "3. If the video is clearly NOT about a place in Japan, set isInJapan to false.",
    "4. For restaurants/food content, try to identify the specific restaurant, not just the dish or neighborhood.",
    "5. Set confidence to 'high' only when you can identify a specific named location with certainty.",
    "6. Set confidence to 'medium' when you can narrow it to a specific place but aren't fully certain.",
    "7. Set confidence to 'low' when you can only guess at the general area or type of place.",
    "8. The description should be a concise editorial summary (max 120 chars), not a restatement of the video title.",
  );

  return parts.join("\n");
}
