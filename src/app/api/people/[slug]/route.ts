import { NextRequest, NextResponse } from "next/server";
import { getPersonWithExperiences } from "@/lib/people/peopleService";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
} from "@/lib/api/middleware";

/**
 * GET /api/people/:slug
 * Returns a person with their linked experiences.
 * Response: { data: PersonWithExperiences }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const context = createRequestContext(request);

  const rateLimitResponse = await checkRateLimit(request, {
    maxRequests: 200,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  const person = await getPersonWithExperiences(slug);

  if (!person) {
    return addRequestContextHeaders(
      NextResponse.json({ error: "Person not found" }, { status: 404 }),
      context
    );
  }

  return addRequestContextHeaders(
    NextResponse.json(
      { data: person },
      {
        headers: {
          "Cache-Control":
            "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
        },
      }
    ),
    context
  );
}
