import { NextRequest, NextResponse } from "next/server";
import { getPersonWithExperiences } from "@/lib/people/peopleService";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { badRequest, notFound } from "@/lib/api/errors";
import { isValidSlug } from "@/lib/api/validation";

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
    async (_req, { context }) => {
      if (!isValidSlug(slug)) {
        return badRequest("Invalid slug", undefined, { requestId: context.requestId });
      }

      const person = await getPersonWithExperiences(slug);

      if (!person) {
        return notFound("Person not found", { requestId: context.requestId });
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
