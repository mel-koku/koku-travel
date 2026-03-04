import { NextRequest, NextResponse } from "next/server";
import {
  getPeopleByExperienceSlug,
  getPeopleByLocationId,
} from "@/lib/people/peopleService";

/**
 * GET /api/people/by-experience?slug=kintsugi-workshop-kyoto
 * GET /api/people/by-experience?locationId=abc-123
 *
 * Returns people linked to an experience by Sanity slug or location ID.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const locationId = request.nextUrl.searchParams.get("locationId");

  if (!slug && !locationId) {
    return NextResponse.json(
      { error: "slug or locationId parameter required" },
      { status: 400 }
    );
  }

  // Try slug first, then locationId
  let people = slug ? await getPeopleByExperienceSlug(slug) : [];
  if (people.length === 0 && locationId) {
    people = await getPeopleByLocationId(locationId);
  }

  return NextResponse.json({ data: people });
}
