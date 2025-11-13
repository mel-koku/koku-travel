import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
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