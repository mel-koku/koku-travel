import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import {
  getWorkshopExperiences,
  getWorkshopExperiencesByCraftType,
} from "@/lib/experiences/experienceService";

export const GET = withApiHandler(
  async (request) => {
    const craftType = request.nextUrl.searchParams.get("type");

    const workshops = craftType
      ? await getWorkshopExperiencesByCraftType(craftType)
      : await getWorkshopExperiences();

    return NextResponse.json(workshops, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  },
  { rateLimit: RATE_LIMITS.EXPERIENCES },
);
