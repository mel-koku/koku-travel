/**
 * Calculate popularity score using Bayesian weighted average.
 * Balances rating quality with review quantity to produce fair rankings.
 * A 4.8 location with 500 reviews ranks higher than a 5.0 with 3 reviews.
 */
export function calculatePopularityScore(rating: number | null, reviewCount: number | null): number {
  const r = rating ?? 0;
  const v = reviewCount ?? 0;
  if (r === 0 || v === 0) return 0;
  const m = 50;
  const C = 4.2;
  const score = (v / (v + m)) * r + (m / (v + m)) * C;
  const reviewBoost = Math.log10(v + 1) / 10;
  return score + reviewBoost;
}
