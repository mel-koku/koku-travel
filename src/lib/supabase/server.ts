// src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieStoreLike = {
  get(name: string): { value?: string } | undefined;
  set(name: string, value: string, options: CookieOptions): void;
  delete?(name: string, options?: CookieOptions): void;
};

export async function createClient() {
  const cookieStore = (await cookies()) as unknown as CookieStoreLike;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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