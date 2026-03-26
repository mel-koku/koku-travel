import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import {
  getPeopleByExperienceSlug,
  getPeopleByLocationId,
} from "@/lib/people/peopleService";

export const GET = withApiHandler(
  async (request) => {
    const slug = request.nextUrl.searchParams.get("slug");
    const locationId = request.nextUrl.searchParams.get("locationId");

    if (!slug && !locationId) {
      return Response.json(
        { error: "slug or locationId parameter required" },
        { status: 400 },
      );
    }

    // Try slug first, then locationId
    let people = slug ? await getPeopleByExperienceSlug(slug) : [];
    if (people.length === 0 && locationId) {
      people = await getPeopleByLocationId(locationId);
    }

    return Response.json({ data: people });
  },
  { rateLimit: RATE_LIMITS.PEOPLE },
);
