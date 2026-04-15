/**
 * Conservative char-based input-token estimate.
 *
 * We purposely over-estimate (3.5 chars/token) to ensure reservations cover
 * the true token count. Real tokenizers average 4 chars/token for English,
 * so our estimate is ~14% higher. Reconciliation with real usageMetadata
 * refunds the difference.
 */

const CHARS_PER_TOKEN = 3.5;

export function estimateInputTokens(input: string | string[]): number {
  if (Array.isArray(input)) {
    return input.reduce((sum, s) => sum + estimateInputTokens(s), 0);
  }
  if (!input) return 1;
  return Math.max(1, Math.ceil(input.length / CHARS_PER_TOKEN));
}
