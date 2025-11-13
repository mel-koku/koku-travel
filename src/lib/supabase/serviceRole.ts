import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;
let hasWarned = false;

export function getServiceRoleClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    if (!hasWarned && process.env.NODE_ENV !== "production") {
      hasWarned = true;
      console.warn(
        "[supabase] SUPABASE_SERVICE_ROLE_KEY is missing; falling back to anon client. " +
          "Place details will not be persisted without a service role key.",
      );
    }
    throw new Error(
      "[supabase] SUPABASE_SERVICE_ROLE_KEY is not configured. Server-only features requiring elevated privileges are disabled.",
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "X-Client-Info": "koku-travel-server",
      },
    },
  });

  return cachedClient;
}

