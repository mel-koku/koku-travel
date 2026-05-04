import "server-only";

import { generateObject } from "ai";
import { z } from "zod";
import {
  getContentAuthoringModel,
  VERTEX_GENERATE_OPTIONS,
} from "./contentAuthoringModel";
import { logVertexUsage } from "../vertexProvider";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import type { AuthoringBudget } from "./authoringBudget";

/**
 * Narrows the loosely-typed `providerMetadata` from the AI SDK down to the
 * `cachedContentTokenCount` integer Vertex emits on Gemini calls. Returns 0
 * for any missing or wrong-shaped subtree — implicit caching just hadn't
 * engaged on that call.
 */
function readCachedTokens(meta: unknown): number {
  if (!meta || typeof meta !== "object") return 0;
  const google = (meta as { google?: unknown }).google;
  if (!google || typeof google !== "object") return 0;
  const usageMetadata = (google as { usageMetadata?: unknown }).usageMetadata;
  if (!usageMetadata || typeof usageMetadata !== "object") return 0;
  const cached = (usageMetadata as { cachedContentTokenCount?: unknown })
    .cachedContentTokenCount;
  return typeof cached === "number" ? cached : 0;
}

/**
 * Pro-model Vertex call with budget-ledger integration. Mirrors the shape of
 * `_llmBatchPrimitives.callVertex` but:
 *   - Uses `gemini-2.5-pro` via `getContentAuthoringModel()` (Pro/Flash
 *     boundary discipline, locked 2026-05-04).
 *   - Reports usage to the in-process `AuthoringBudget` ledger, not the
 *     Redis-backed user-facing cost gate.
 *   - Includes `cachedContentTokenCount` in the ledger entry so cache-hit
 *     rate is observable mid-run.
 *
 * Caller must check `budget.shouldHalt()` BEFORE this call. The ledger only
 * records usage AFTER the call returns; halt is enforced by the caller.
 */
export async function callContentVertex<T>(opts: {
  prompt: string;
  schema: z.ZodType<T>;
  source: string;
  budget: AuthoringBudget;
  timeoutMs?: number;
  abortSignal?: AbortSignal;
}): Promise<T> {
  const perCallTimeout = AbortSignal.timeout(opts.timeoutMs ?? 30_000);
  const combined = opts.abortSignal
    ? AbortSignal.any([perCallTimeout, opts.abortSignal])
    : perCallTimeout;

  try {
    const result = await generateObject({
      model: getContentAuthoringModel(),
      providerOptions: VERTEX_GENERATE_OPTIONS,
      schema: opts.schema,
      prompt: opts.prompt,
      abortSignal: combined,
    });

    logVertexUsage(opts.source, result, { model: "gemini-2.5-pro" });

    opts.budget.recordCall({
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      cachedTokens: readCachedTokens(result.providerMetadata),
    });

    return result.object as T;
  } catch (err) {
    logger.warn("content authoring Vertex call failed", {
      source: opts.source,
      error: getErrorMessage(err),
    });
    throw err;
  }
}
