"use client";

import { useAppState } from "@/state/AppState";
import type { TipEventContext } from "./tipEvents";

/**
 * Assembles the TipEventContext from AppState for C14 banner logging.
 *
 * Authenticated users (with an email) get their auth-issued id written to
 * user_id. Guests (no email) get their rotating AppState id written to
 * guest_id so per-guest analytics is possible without polluting auth.users.
 * This matches the auth/guest split in ItineraryClient.tsx:149.
 */
export function useTipEventContext(
  tripId: string,
  region?: string,
): TipEventContext {
  const { user } = useAppState();
  const isAuthenticated = Boolean(user.email);

  return {
    tripId,
    userId: isAuthenticated ? user.id : null,
    guestId: isAuthenticated ? null : user.id,
    ...(region ? { region } : {}),
  };
}
