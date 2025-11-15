import { createBrowserClient } from "@supabase/ssr";
import { logger } from "../logger";
import { env } from "../env";

type BrowserClient = ReturnType<typeof createBrowserClient>;

let hasWarned = false;

export function createClient(): BrowserClient | null {
  const url = env.supabaseUrl;
  const anonKey = env.supabaseAnonKey;

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
