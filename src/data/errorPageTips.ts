/**
 * Travel tips displayed on 404 error pages.
 * Rotates randomly to provide helpful guidance when users hit a missing page.
 */

export const ERROR_PAGE_TIPS = [
  "Lost? Download offline maps of Japan before you go. Google Maps works without internet in most areas.",
  "Need yen? Convenience stores have ATMs that accept foreign cards. 7-Eleven and Lawson are everywhere.",
  "Temple etiquette: Don't point at statues. Remove shoes on wooden floors. Bow slightly when passing through gates.",
  "JR Pass covers most trains but not subways or private railways. Check which lines you need before buying.",
  "Taxi colors vary by city. Red, green, and white are common in Tokyo. Hail any color — they're all metered.",
];

/**
 * Get a random tip from the error page tips list.
 * @returns A single tip string
 */
export function getRandomErrorPageTip(): string {
  const index = Math.floor(Math.random() * ERROR_PAGE_TIPS.length);
  return ERROR_PAGE_TIPS[index] || ERROR_PAGE_TIPS[0];
}
