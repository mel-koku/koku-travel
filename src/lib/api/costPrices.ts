/**
 * Static price table for Vertex/Gemini models.
 *
 * Values are in TENTHS OF A CENT per 1,000,000 tokens to avoid float drift.
 * 100 tenths-cent = 10¢ = $0.10.
 *
 * Source: https://cloud.google.com/vertex-ai/generative-ai/pricing
 * Last verified: 2026-04-15. Update this file when Google changes prices.
 */

export const MODEL_PRICES_PER_MILLION_TENTHS_CENT = {
  "gemini-2.5-flash-lite": { input: 100, output: 400 },
  "gemini-2.5-flash": { input: 300, output: 2500 },
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
