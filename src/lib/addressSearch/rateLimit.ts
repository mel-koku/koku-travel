import type { SupabaseClient } from "@supabase/supabase-js";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
};

/**
 * Atomically increments the user's address-search usage for today
 * and returns whether they're under the daily cap.
 *
 * Relies on the RPC `increment_address_search_usage` which upserts and
 * returns the new count.
 */
export async function checkAndIncrement(
  client: SupabaseClient,
  userId: string,
  dailyCap: number,
): Promise<RateLimitResult> {
  const { data, error } = await client.rpc("increment_address_search_usage", {
    p_user_id: userId,
  });
  if (error) throw error;
  const count = (data as number | null) ?? 0;
  return {
    allowed: count <= dailyCap,
    remaining: Math.max(0, dailyCap - count),
  };
}
