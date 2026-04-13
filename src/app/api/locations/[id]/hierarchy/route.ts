import { NextResponse, type NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { badRequest } from "@/lib/api/errors";
import { isUuid } from "@/lib/api/validation";
import { fetchLocationById } from "@/lib/locations/locationService";
import { fetchHierarchyContext } from "@/lib/locations/hierarchyService";

/**
 * GET /api/locations/[id]/hierarchy
 *
 * Returns hierarchy context for a location detail page:
 * - children: child locations (if parent)
 * - subExperiences: editorial highlights, route stops, time variants
 * - relationships: cluster and alternative relationships with full location data
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;

  return withApiHandler(
    async () => {
      if (!isUuid(id)) {
        return badRequest("Invalid location ID format");
      }

      const location = await fetchLocationById(id);
      if (!location) {
        return badRequest("Location not found");
      }

      const context = await fetchHierarchyContext(location);

      return NextResponse.json(context, {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
        },
      });
    },
    { rateLimit: RATE_LIMITS.LOCATIONS },
  )(request);
}
