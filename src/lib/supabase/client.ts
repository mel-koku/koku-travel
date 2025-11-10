import { createBrowserClient } from "@supabase/ssr";



export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,          // should be https://mbjcxrfuuczlauavash.supabase.co
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!      // should start with sb_publishable_
  );
}
