import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const PREVIEW_SECRET = process.env.SANITY_PREVIEW_SECRET;

function resolveRedirectUrl(request: NextRequest, slug: string) {
  const target = slug.startsWith("/") ? slug : `/${slug}`;
  return new URL(target, request.url);
}

export async function GET(request: NextRequest) {
  if (!PREVIEW_SECRET) {
    return NextResponse.json(
      { message: "Preview secret is not configured on the server." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const slug = searchParams.get("slug");

  if (!secret || secret !== PREVIEW_SECRET) {
    return NextResponse.json({ message: "Invalid preview secret." }, { status: 401 });
  }

  if (!slug) {
    return NextResponse.json({ message: "Missing slug parameter." }, { status: 400 });
  }

  draftMode().enable();
  return NextResponse.redirect(resolveRedirectUrl(request, slug));
}

