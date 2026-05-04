/**
 * Static price table for Vertex/Gemini models.
 *
 * Values are in TENTHS OF A CENT per 1,000,000 tokens to avoid float drift.
 * 100 tenths-cent = 10¢ = $0.10.
 *
 * Source: https://cloud.google.com/vertex-ai/generative-ai/pricing
 * Last verified: 2026-05-04. Update this file when Google changes prices.
 *
 * Pro pricing assumes prompts ≤200k tokens (the >200k tier is $2.50/$15
 * per million). All current and planned call shapes are well under that
 * threshold; revisit if a future pipeline pushes past it.
 */

export const MODEL_PRICES_PER_MILLION_TENTHS_CENT = {
  "gemini-2.5-flash-lite": { input: 100, output: 400 },
  "gemini-2.5-flash": { input: 300, output: 2500 },
  "gemini-2.5-pro": { input: 1250, output: 10000 },
} as const;

type KnownModel = keyof typeof MODEL_PRICES_PER_MILLION_TENTHS_CENT;

function getPrices(model: string): { input: number; output: number } {
  if (model in MODEL_PRICES_PER_MILLION_TENTHS_CENT) {
    return MODEL_PRICES_PER_MILLION_TENTHS_CENT[model as KnownModel];
  }
  return MODEL_PRICES_PER_MILLION_TENTHS_CENT["gemini-2.5-flash"];
}

/**
 * Returns cost in tenths-of-a-cent. Rounds up to avoid under-charging.
 */
export function estimateCostTenthsCent(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const prices = getPrices(model);
  const inputCost = (inputTokens * prices.input) / 1_000_000;
  const outputCost = (outputTokens * prices.output) / 1_000_000;
  return Math.ceil(inputCost + outputCost);
}

/**
 * Vertex AI Search grounding fee, charged per request that actually invoked the
 * grounding tool (≥1 web search). $35 per 1,000 grounded requests = 35
 * tenths-of-a-cent (= $0.035) per request. Token cost is billed separately
 * via {@link estimateCostTenthsCent}.
 *
 * Source: https://cloud.google.com/vertex-ai/generative-ai/pricing#grounding
 */
export const GROUNDED_REQUEST_FEE_TC = 35;

/**
 * Total grounding-fee cost for `count` grounded requests, in tenths-of-a-cent.
 */
export function groundingFeeTenthsCent(count: number): number {
  return Math.max(0, count) * GROUNDED_REQUEST_FEE_TC;
}
