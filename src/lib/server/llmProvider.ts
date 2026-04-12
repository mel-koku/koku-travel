import "server-only";

/**
 * LLM Provider abstraction -- single source of truth for model creation.
 *
 * Provider selection cascade:
 * 1. LLM_PROVIDER env var set explicitly -> use that (vertex | google)
 * 2. GOOGLE_VERTEX_PROJECT + creds present -> vertex
 * 3. GOOGLE_GENERATIVE_AI_API_KEY present -> google (free API)
 * 4. None -> null (graceful degradation)
 */

import { google } from "@ai-sdk/google";
import { vertex } from "@ai-sdk/google-vertex";
import { logger } from "@/lib/logger";
import type { LanguageModelV3 } from "@ai-sdk/provider";

const MODEL_ID = "gemini-2.5-flash";

type ProviderType = "vertex" | "google" | null;

function detectProvider(): ProviderType {
  const override = process.env.LLM_PROVIDER?.toLowerCase();
  if (override === "vertex") return "vertex";
  if (override === "google") return "google";

  if (
    process.env.GOOGLE_VERTEX_PROJECT &&
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  ) {
    return "vertex";
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return "google";
  }

  return null;
}

const provider = detectProvider();

/**
 * Returns a Gemini language model, or null if no provider credentials are available.
 *
 * All call sites already handle null (they have rule-based/template fallbacks).
 */
export function getModel(): LanguageModelV3 | null {
  if (provider === "vertex") {
    return vertex(MODEL_ID);
  }
  if (provider === "google") {
    return google(MODEL_ID);
  }

  logger.warn("No LLM provider configured, AI features disabled");
  return null;
}

/** True when the active provider is Vertex AI (for Vertex-only features like grounding, caching). */
export function isVertexProvider(): boolean {
  return provider === "vertex";
}

/**
 * Provider options that fix the known streamFunctionCallArguments bug.
 *
 * @ai-sdk/google-vertex defaults streamFunctionCallArguments to true,
 * which Vertex rejects for generateObject calls. This disables it.
 *
 * Pass to every generateObject/streamText call:
 *   generateObject({ model: getModel()!, providerOptions: VERTEX_PROVIDER_OPTIONS, ... })
 */
export const VERTEX_PROVIDER_OPTIONS = {
  google: { streamFunctionCallArguments: false },
} as const;
