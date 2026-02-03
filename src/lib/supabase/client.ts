import { createBrowserClient } from "@supabase/ssr";
import { logger } from "../logger";
import { env } from "../env";

type BrowserClient = ReturnType<typeof createBrowserClient>;

let cachedClient: BrowserClient | null = null;
let hasWarned = false;

export function createClient(): BrowserClient | null {
  // Return cached instance if available
  if (cachedClient) {
    return cachedClient;
  }

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

  cachedClient = createBrowserClient(url, anonKey);
  return cachedClient;
}
