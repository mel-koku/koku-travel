import { NextResponse } from "next/server";
import { badRequest } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { createClient } from "@/lib/supabase/server";

const MAX_IDS = 200;

const PRINT_COLUMNS = `id, name_japanese, nearest_station, cash_only, reservation_info`;

type PrintEnrichmentRow = {
  id: string;
  name_japanese: string | null;
  nearest_station: string | null;
  cash_only: boolean | null;
  reservation_info: string | null;
};

const RESERVATION_LEVELS = new Set(["required", "recommended"]);

export type PrintEnrichmentMap = Record<
  string,
  {
    nameJapanese?: string;
    nearestStation?: string;
    cashOnly?: boolean;
    reservationInfo?: "required" | "recommended";
  }
>;

export const GET = withApiHandler(
  async (request, { context }) => {
    const idsParam = request.nextUrl.searchParams.get("ids");

    if (!idsParam || idsParam.trim() === "") {
      return badRequest("Missing required 'ids' parameter", undefined, {
        requestId: context.requestId,
      });
    }

    const ids = [...new Set(
      idsParam.split(",").map((id) => id.trim()).filter((id) => id.length > 0),
    )];

    if (ids.length === 0) {
      return badRequest("No valid IDs provided", undefined, {
        requestId: context.requestId,
      });
    }

    if (ids.length > MAX_IDS) {
      return badRequest(
        `Too many IDs. Maximum ${MAX_IDS} per request, got ${ids.length}`,
        undefined,
        { requestId: context.requestId },
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("locations")
      .select(PRINT_COLUMNS)
      .in("id", ids);

    if (error || !data) {
      return NextResponse.json({ data: {} }, { status: 200 });
    }

    const enrichment: PrintEnrichmentMap = {};
    for (const row of data as PrintEnrichmentRow[]) {
      enrichment[row.id] = {
        nameJapanese: row.name_japanese ?? undefined,
        nearestStation: row.nearest_station ?? undefined,
        cashOnly: row.cash_only ?? undefined,
        reservationInfo: RESERVATION_LEVELS.has(row.reservation_info ?? "")
          ? (row.reservation_info as "required" | "recommended")
          : undefined,
      };
    }

    return NextResponse.json(
      { data: enrichment },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      },
    );
  },
  { rateLimit: RATE_LIMITS.LOCATIONS_BATCH },
);
