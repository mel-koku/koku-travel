import { NextRequest, NextResponse } from "next/server";
import { getPersonWithExperiences } from "@/lib/people/peopleService";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";

/**
 * GET /api/people/:slug
 * Returns a person with their linked experiences.
 * Response: { data: PersonWithExperiences }
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ slug: string }> },
) {
  const { slug } = await props.params;
  return withApiHandler(
    async () => {
      const person = await getPersonWithExperiences(slug);

      if (!person) {
        return NextResponse.json({ error: "Person not found" }, { status: 404 });
      }

      return NextResponse.json(
        { data: person },
        {
          headers: {
            "Cache-Control":
              "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
          },
        },
      );
    },
    { rateLimit: RATE_LIMITS.PEOPLE },
  )(request);
}
