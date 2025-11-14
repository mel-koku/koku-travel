import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/api/rateLimit";

export async function GET(request: NextRequest) {
  // Rate limiting: 30 requests per minute per IP (auth callback)
  const rateLimitResponse = checkRateLimit(request, { maxRequests: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("Supabase exchange error:", error);
      }
    } catch (error) {
      console.error("Supabase callback client unavailable.", error);
    }
  }
  return NextResponse.redirect(`${origin}/account`);
}