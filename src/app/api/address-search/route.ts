import { NextResponse } from "next/server";
import { mapboxSuggest, mapboxRetrieve } from "@/lib/addressSearch/mapbox";
import { googleSearch, googleRetrieve } from "@/lib/addressSearch/google";
import { checkAndIncrement } from "@/lib/addressSearch/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const DAILY_CAP = 100;

type ReqBody =
  | { action: "suggest"; provider: "mapbox" | "google"; query: string; sessionToken: string }
  | { action: "retrieve"; provider: "mapbox" | "google"; id: string; sessionToken: string };

export async function POST(req: Request) {
  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Only count suggest requests; retrieve is paired with a prior suggest session
  if (body.action === "suggest") {
    try {
      const limit = await checkAndIncrement(supabase, userId, DAILY_CAP);
      if (!limit.allowed) {
        return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
      }
    } catch (err) {
      // Fail-open: allow the request but log the infra issue
      logger.error("[address-search] rate limit check failed, allowing", { error: err });
    }
  }

  const mapboxKey = process.env.ROUTING_MAPBOX_ACCESS_TOKEN;
  const googleKey = process.env.GOOGLE_PLACES_API_KEY;

  try {
    if (body.action === "suggest") {
      const suggestions =
        body.provider === "mapbox"
          ? await mapboxSuggest(body.query, body.sessionToken, mapboxKey ?? "")
          : await googleSearch(body.query, body.sessionToken, googleKey ?? "");
      return NextResponse.json({ suggestions });
    } else {
      const result =
        body.provider === "mapbox"
          ? await mapboxRetrieve(body.id, body.sessionToken, mapboxKey ?? "")
          : await googleRetrieve(body.id, body.sessionToken, googleKey ?? "");
      return NextResponse.json({ result });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 502 },
    );
  }
}
