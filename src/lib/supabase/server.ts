// src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { env } from "@/lib/env";

type CookieStoreLike = {
  get(name: string): { value?: string } | undefined;
  set(name: string, value: string, options: CookieOptions): void;
  delete?(name: string, options?: CookieOptions): void;
};

export async function createClient() {
  const url = env.supabaseUrl;
  const anonKey = env.supabaseAnonKey;

  if (!url || !anonKey) {
    throw new Error(
      "[supabase] Server client requested without NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY configured.",
    );
  }

  const cookieStore = (await cookies()) as unknown as CookieStoreLike;

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // some contexts throw; that's fine for read-only usage
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } catch {
            try {
              cookieStore.delete?.(name);
            } catch {
              // ignore
            }
          }
        },
      },
    }
  );
}