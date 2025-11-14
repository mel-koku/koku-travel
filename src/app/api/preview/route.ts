import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { internalError, unauthorized, badRequest } from "@/lib/api/errors";

const PREVIEW_SECRET = process.env.SANITY_PREVIEW_SECRET;

function resolveRedirectUrl(request: NextRequest, slug: string) {
  const target = slug.startsWith("/") ? slug : `/${slug}`;
  return new URL(target, request.url);
}

export async function GET(request: NextRequest) {
  if (!PREVIEW_SECRET) {
    return internalError("Preview secret is not configured on the server.");
  }

  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const slug = searchParams.get("slug");

  if (!secret || secret !== PREVIEW_SECRET) {
    return unauthorized("Invalid preview secret.");
  }

  if (!slug) {
    return badRequest("Missing slug parameter.");
  }

  const draft = await draftMode();
  draft.enable();
  return NextResponse.redirect(resolveRedirectUrl(request, slug));
}

