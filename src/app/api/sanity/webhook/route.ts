import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { logger } from "@/lib/logger";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { unauthorized, badRequest, internalError } from "@/lib/api/errors";

const WEBHOOK_SECRET = process.env.SANITY_REVALIDATE_SECRET;

type SanityWebhookBody = {
  _type: string;
  _id: string;
  slug?: { current: string };
  title?: string;
  subtitle?: string;
  summary?: string;
  guideType?: string;
  tags?: string[];
  city?: string;
  region?: string;
  readingTimeMinutes?: number;
  editorialStatus?: string;
  featured?: boolean;
  sortOrder?: number;
  publishedAt?: string;
  authorName?: string;
  featuredImageUrl?: string;
  thumbnailImageUrl?: string;
  locationIds?: Array<{ locationId: string }>;
  operation?: "create" | "update" | "delete";
};

export const POST = withApiHandler(async (request: NextRequest) => {
  // Reject if webhook secret is not configured (prevents bypass in misconfigured environments)
  if (!WEBHOOK_SECRET) {
    logger.error("SANITY_REVALIDATE_SECRET not configured");
    return internalError("Webhook not configured");
  }

  // Validate webhook secret using timing-safe comparison to prevent timing attacks
  const secret = request.headers.get("sanity-webhook-secret");
  const secretBuf = Buffer.from(secret ?? "", "utf8");
  const expectedBuf = Buffer.from(WEBHOOK_SECRET ?? "", "utf8");
  if (secretBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(secretBuf, expectedBuf)) {
    return unauthorized();
  }

  let body: SanityWebhookBody;
  try {
    body = (await request.json()) as SanityWebhookBody;
  } catch {
    return badRequest("Invalid JSON body");
  }

  switch (body._type) {
    case "guide":
      return await handleGuide(body);
    case "experience":
      return await handleExperience(body);
    case "landingPage":
    case "siteSettings":
      return await handleSingletonRevalidation(body._type, ["/"]);
    case "tripBuilderConfig":
      return await handleSingletonRevalidation(body._type, ["/trip-builder"]);
    case "pagesContent":
      return await handleSingletonRevalidation(body._type, [
        "/places",
        "/guides",
        "/local-experts",
        "/saved",
        "/dashboard",
        "/account",
        "/itinerary",
      ]);
    case "commerceDisclosure":
      return await handleSingletonRevalidation(body._type, ["/commerce-disclosure"]);
    case "aboutPage":
      return await handleSingletonRevalidation(body._type, ["/about"]);
    default:
      return NextResponse.json({ skipped: true, reason: `Unknown type: ${body._type}` });
  }
}, { rateLimit: RATE_LIMITS.WEBHOOK });

// ── Guide handler (unchanged logic) ────────────────────────

async function handleGuide(body: SanityWebhookBody) {
  const slug = body.slug?.current;
  if (!slug) {
    return badRequest("Missing slug");
  }

  const supabase = getServiceRoleClient();

  // Handle delete or archive
  if (body.operation === "delete" || body.editorialStatus === "archived") {
    const { error } = await supabase
      .from("guides")
      .update({ status: "archived" })
      .eq("id", slug);

    if (error) {
      logger.error("[sanity-webhook] Archive error:", error);
      return internalError(error.message);
    }

    revalidatePath("/guides");
    revalidatePath(`/guides/${slug}`);
    revalidatePath("/");

    return NextResponse.json({ ok: true, action: "archived", slug });
  }

  // Only sync published guides to Supabase
  if (body.editorialStatus !== "published") {
    return NextResponse.json({ skipped: true, reason: "Not published" });
  }

  // Upsert summary to Supabase
  const locationIdStrings = body.locationIds?.map((l) => l.locationId) || [];

  const { error } = await supabase
    .from("guides")
    .upsert(
      {
        id: slug,
        title: body.title || "",
        subtitle: body.subtitle || null,
        summary: body.summary || "",
        body: "",
        featured_image: body.featuredImageUrl || "",
        thumbnail_image: body.thumbnailImageUrl || null,
        guide_type: body.guideType || "deep_dive",
        tags: body.tags || [],
        city: body.city || null,
        region: body.region || null,
        location_ids: locationIdStrings,
        reading_time_minutes: body.readingTimeMinutes || null,
        author: body.authorName || "Yuku Japan",
        status: "published",
        featured: body.featured ?? false,
        sort_order: body.sortOrder ?? 100,
        published_at: body.publishedAt || new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) {
    logger.error("[sanity-webhook] Upsert error:", error);
    return internalError(error.message);
  }

  revalidatePath("/guides");
  revalidatePath(`/guides/${slug}`);
  revalidatePath("/");

  return NextResponse.json({ ok: true, action: "upserted", slug });
}

// ── Experience handler (revalidation only, no Supabase sync) ──

async function handleExperience(body: SanityWebhookBody) {
  const slug = body.slug?.current;

  revalidatePath("/guides");
  if (slug) {
    revalidatePath(`/guides/${slug}`);
  }

  return NextResponse.json({ ok: true, action: "revalidated", slug });
}

// ── Singleton revalidation ─────────────────────────────────

async function handleSingletonRevalidation(
  type: string,
  paths: string[]
) {
  for (const path of paths) {
    revalidatePath(path);
  }
  // Always revalidate home since siteSettings affects footer
  if (!paths.includes("/")) {
    revalidatePath("/");
  }

  return NextResponse.json({ ok: true, action: "revalidated", type, paths });
}
