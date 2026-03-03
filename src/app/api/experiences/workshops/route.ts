import { NextRequest, NextResponse } from "next/server";
import {
  getWorkshopExperiences,
  getWorkshopExperiencesByCraftType,
} from "@/lib/experiences/experienceService";

export async function GET(request: NextRequest) {
  const craftType = request.nextUrl.searchParams.get("type");

  const workshops = craftType
    ? await getWorkshopExperiencesByCraftType(craftType)
    : await getWorkshopExperiences();

  return NextResponse.json(workshops, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
