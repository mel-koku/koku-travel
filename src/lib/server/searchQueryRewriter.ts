import "server-only";

/**
 * Smart-search Tier 3: LLM query rewriter.
 *
 * Asks Gemini Flash to interpret a user's search query as 1-5 candidate place
 * names that the catalog might contain. Used as the slowest fallback in the
 * /api/locations/search cascade — only fires on explicit user action (the
 * "Search smarter ✨" button in the LocationSearchBar empty state) so per-call
 * cost scales with intent, not keystrokes.
 *
 * Returns null on any failure so the caller can fall through to the
 * empty-state CTA without breaking the user experience.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { getModel, VERTEX_PROVIDER_OPTIONS } from "./llmProvider";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";

/** Hard timeout to keep the user experience tolerable when Vertex is slow. */
const REWRITE_TIMEOUT_MS = 5000;

const searchRewriteSchema = z.object({
  candidates: z
    .array(z.string())
    .min(0)
    .max(5)
    .describe(
      "1-5 candidate place names the user might mean. Use the canonical English name as it would appear in a Japan tourism guide. Empty array if nothing plausible matches.",
    ),
});

export type SearchRewriteResult = {
  candidates: string[];
};

export type RewriteContext = {
  /** Current day's city — biases candidates to this city when ambiguous. */
  currentCity?: string;
  /** All cities in the trip — broadens candidates to in-trip cities. */
  tripCities?: string[];
};

/**
 * Rewrite a user query into candidate place names for catalog re-search.
 *
 * Returns null on any failure (no model, timeout, parse error, abort). Caller
 * should treat that as "no smart-search candidates available" and fall through.
 */
export async function rewriteSearchQuery(
  query: string,
  context: RewriteContext = {},
): Promise<SearchRewriteResult | null> {
  if (!query.trim()) return null;

  const model = getModel();
  if (!model) {
    logger.warn("searchQueryRewriter: no Gemini model available");
    return null;
  }

  const cityHint = context.currentCity
    ? `\n- Current day's city: ${context.currentCity}`
    : "";
  const tripHint =
    context.tripCities && context.tripCities.length > 0
      ? `\n- Cities in this trip: ${context.tripCities.join(", ")}`
      : "";

  const prompt = `You are helping interpret a user's search query inside a Japan trip-planning app's location catalog (~5,860 curated places: shrines, temples, restaurants, neighborhoods, viewpoints, museums, etc.).

The user typed: "${query.trim()}"${cityHint}${tripHint}

Return up to 5 candidate place names the user might mean. Use the canonical English name as it would appear in a Japan tourism guide (e.g. "Amerika-Mura", "Tsutenkaku Tower", "Kinkaku-ji"). Common cases to handle:
- Misspellings of Japanese names ("amemura" → "Amerika-Mura")
- Romanization variants ("kiyomizudera" → "Kiyomizu-dera")
- Descriptive references ("the parachute statue district in osaka" → "Amerika-Mura")
- Nicknames or partial names ("crossing" → "Shibuya Crossing")

If the query mentions a city or region but no specific place, suggest 1-3 well-known places in that area.
If nothing plausible matches, return an empty candidates array — don't invent obscure places.

Lean toward the user's trip context when ambiguous: places in their current city or trip cities are more likely candidates than far-away places with similar names.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REWRITE_TIMEOUT_MS);

  try {
    const result = await generateObject({
      model,
      providerOptions: VERTEX_PROVIDER_OPTIONS,
      schema: searchRewriteSchema,
      prompt,
      abortSignal: controller.signal,
    });
    clearTimeout(timeout);

    const candidates = result.object.candidates
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    return { candidates };
  } catch (error) {
    clearTimeout(timeout);
    logger.warn("searchQueryRewriter: rewrite failed", {
      error: getErrorMessage(error),
      query: query.slice(0, 100),
    });
    return null;
  }
}
