import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { logger } from "@/lib/logger";

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

export async function POST(request: NextRequest) {
  // Validate webhook secret
  const secret = request.headers.get("sanity-webhook-secret");
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as SanityWebhookBody;

  switch (body._type) {
    case "guide":
      return handleGuide(body);
    case "landingPage":
    case "siteSettings":
      return handleSingletonRevalidation(body._type, ["/"]);
    case "tripBuilderConfig":
      return handleSingletonRevalidation(body._type, ["/trip-builder"]);
    default:
      return NextResponse.json({ skipped: true, reason: `Unknown type: ${body._type}` });
  }
}

// ── Guide handler (unchanged logic) ────────────────────────

async function handleGuide(body: SanityWebhookBody) {
  const slug = body.slug?.current;
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
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
      return NextResponse.json({ error: error.message }, { status: 500 });
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
        author: body.authorName || "Koku Travel",
        status: "published",
        featured: body.featured ?? false,
        sort_order: body.sortOrder ?? 100,
        published_at: body.publishedAt || new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) {
    logger.error("[sanity-webhook] Upsert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/guides");
  revalidatePath(`/guides/${slug}`);
  revalidatePath("/");

  return NextResponse.json({ ok: true, action: "upserted", slug });
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
