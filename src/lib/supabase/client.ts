import { createBrowserClient } from "@supabase/ssr";
import { logger } from "../logger";

type BrowserClient = ReturnType<typeof createBrowserClient>;

let hasWarned = false;

export function createClient(): BrowserClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (!hasWarned) {
      hasWarned = true;
      logger.warn(
        "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Remote features are disabled until the environment is configured.",
      );
    }
    return null;
  }

  return createBrowserClient(url, anonKey);
}
