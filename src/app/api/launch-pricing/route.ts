import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { logger } from "@/lib/logger";

export const revalidate = 30;

type LaunchPricingResponse = {
  remaining: number | null;
  total: number | null;
};

export async function GET(): Promise<NextResponse<LaunchPricingResponse>> {
  const headers = { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" };
  try {
    const supabase = getServiceRoleClient();
    const { data } = await supabase
      .from("launch_pricing")
      .select("remaining_slots, total_slots")
      .eq("id", "default")
      .single();

    if (!data) {
      return NextResponse.json({ remaining: null, total: null }, { headers });
    }

    return NextResponse.json(
      { remaining: data.remaining_slots, total: data.total_slots },
      { headers },
    );
  } catch (error) {
    logger.error("Failed to read launch_pricing", error instanceof Error ? error : undefined, {
      route: "/api/launch-pricing",
    });
    return NextResponse.json({ remaining: null, total: null }, { headers });
  }
}
