import { isValidSignature } from "@sanity/webhook";
import { revalidatePath, revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SIGNATURE_HEADER = "x-sanity-signature";
const SECRET = process.env.SANITY_REVALIDATE_SECRET || process.env.SANITY_PREVIEW_SECRET;

type SanityWebhookPayload = {
  _type?: string;
  slug?: {
    current?: string;
  };
  paths?: string[];
};

function normalizePaths(payload: SanityWebhookPayload): string[] {
  const paths = new Set<string>();
  if (payload.paths && Array.isArray(payload.paths)) {
    for (const path of payload.paths) {
      if (typeof path === "string" && path.trim().length > 0) {
        paths.add(path.startsWith("/") ? path : `/${path}`);
      }
    }
  }

  const slug = payload.slug?.current;
  if (slug) {
    paths.add("/guides");
    paths.add(slug.startsWith("/") ? slug : `/guides/${slug.replace(/^\//, "")}`);
  }

  if (payload._type === "guide") {
    paths.add("/guides");
  }

  if (paths.size === 0) {
    paths.add("/guides");
  }

  return Array.from(paths);
}

export async function POST(request: NextRequest) {
  if (!SECRET) {
    return NextResponse.json(
      { message: "Revalidation secret is not configured on the server." },
      { status: 501 },
    );
  }

  const signature = request.headers.get(SIGNATURE_HEADER) ?? "";
  const rawBody = await request.text();

  if (!signature || !isValidSignature(rawBody, signature, SECRET)) {
    return NextResponse.json({ message: "Invalid signature." }, { status: 401 });
  }

  let payload: SanityWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to parse webhook payload.", error: (error as Error).message },
      { status: 400 },
    );
  }

  const paths = normalizePaths(payload);

  for (const path of paths) {
    revalidatePath(path);
  }

  revalidateTag("guides");

  return NextResponse.json({ revalidated: paths, tags: ["guides"] });
}

