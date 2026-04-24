import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export async function stampFreeUnlockedAt(
  supabase: SupabaseClient,
  tripId: string,
  userId: string,
): Promise<void> {
  try {
    const { error } = await supabase
      .from("trips")
      .update({ free_unlocked_at: new Date().toISOString() } as never)
      .eq("id", tripId)
      .eq("user_id", userId)
      .is("free_unlocked_at", null)
      .is("unlocked_at", null);

    if (error) {
      logger.error(
        "Failed to stamp free_unlocked_at",
        new Error(error.message),
        { tripId, userId },
      );
    }
  } catch (err) {
    logger.error(
      "Exception stamping free_unlocked_at",
      err instanceof Error ? err : new Error(String(err)),
      { tripId, userId },
    );
  }
}
