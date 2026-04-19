import { getConsent } from "@/lib/cookieConsent";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

/**
 * C14 tip telemetry. Trip-level banners call logTipEvent on mount and
 * dismissal to capture engagement signal. See the migration at
 * supabase/migrations/20260420000001_add_tip_engagements.sql for the
 * schema and PII policy.
 */

export type TipId =
  | "prep"
  | "disaster"
  | "earthquake"
  | "goshuin"
  | "accessibility";

export type TipAction = "rendered" | "dismissed";

export interface TipEventContext {
  tripId: string;
  /** Authenticated user's auth.users.id. Null for guests. */
  userId: string | null;
  /** Guest session UUID from AppState. Only populated when userId is null. */
  guestId?: string | null;
  /** Optional region token (WeatherRegion or KnownRegionId string). */
  region?: string;
}

/**
 * Fire-and-forget logger for banner engagement events.
 *
 * - Consent-gated: returns immediately unless analytics_storage is granted.
 *   Mirrors the GA Consent Mode v2 pattern used by `GoogleAnalytics.tsx`.
 * - Never awaits from the render path. Callers pass the returned promise to
 *   `void`, or ignore it entirely.
 * - Never throws. Errors are swallowed with a debug log so a transient
 *   Supabase blip can't take down a banner render.
 * - Guest / auth split: the `tip_engagements` table enforces exactly one of
 *   user_id or guest_id via CHECK constraint. We honor that here.
 */
export async function logTipEvent(
  tipId: TipId,
  action: TipAction,
  context: TipEventContext,
): Promise<void> {
  if (getConsent() !== "granted") return;

  const supabase = createClient();
  if (!supabase) return;

  // Resolve identity: authenticated userId wins; fall back to guestId.
  // If both are null, we skip — the CHECK constraint would reject it anyway.
  const row: {
    user_id: string | null;
    guest_id: string | null;
    trip_id: string;
    tip_id: string;
    action: string;
    region?: string;
  } = {
    user_id: context.userId,
    guest_id: context.userId ? null : (context.guestId ?? null),
    trip_id: context.tripId,
    tip_id: tipId,
    action,
    ...(context.region ? { region: context.region } : {}),
  };

  if (!row.user_id && !row.guest_id) return;

  try {
    const { error } = await supabase.from("tip_engagements").insert(row);
    if (error) {
      logger.debug("tipEvents insert failed", { error: error.message, tipId, action });
    }
  } catch (err) {
    logger.debug("tipEvents threw", { err: err instanceof Error ? err.message : String(err), tipId, action });
  }
}
