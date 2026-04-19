/**
 * Union of every advisory kind that can be surfaced in the trip advisories tray
 * or as an inline day note. Keep this list closed; adding a new kind requires
 * an entry here and a renderer in TripAdvisoriesTray.
 */
export type AdvisoryKind =
  | "prep-checklist"
  | "goshuin"
  | "seasonal-highlight"
  | "day-trip-festival"
  | "free-launch-promo"
  | "accessibility-prep"
  | "v2-launch-nudge";

/**
 * An advisory_key is a deterministic string combining kind + context.
 * Examples:
 *   "prep-checklist"                          (one per trip)
 *   "goshuin"                                 (one per trip)
 *   "seasonal-highlight:cherry-blossom-2026"  (kind + highlight id)
 *   "day-trip-festival:sensoji:2026-04-24"    (kind + location + date)
 *   "free-launch-promo"                       (one per user lifetime)
 *   "v2-launch-nudge"                         (one per user per trip)
 */
export type AdvisoryKey = string;

export function buildAdvisoryKey(kind: AdvisoryKind, context?: string): AdvisoryKey {
  return context ? `${kind}:${context}` : kind;
}

export type TripAdvisorySeen = {
  userId: string;
  tripId: string;
  advisoryKey: AdvisoryKey;
  dismissedAt: Date;
};
