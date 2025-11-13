import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  draftMode().disable();
  const referer = request.headers.get("Referer");
  const redirectUrl = referer ? new URL(referer) : new URL("/", request.url);
  return NextResponse.redirect(redirectUrl);
}

export async function POST(request: NextRequest) {
  draftMode().disable();
  const redirectUrl = request.nextUrl.searchParams.get("redirectTo");
  return NextResponse.json({
    ok: true,
    redirect: redirectUrl ?? "/",
  });
}

