import { NextRequest, NextResponse } from "next/server";
import { requestRoute } from "@/lib/routing";
import type { RoutingRequest } from "@/lib/routing/types";

/**
 * POST /api/routing/estimate
 * 
 * Estimates travel time and distance for a route.
 * Returns a lightweight response with just duration and distance.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RoutingRequest;
    
    // Validate required fields
    if (!body.origin || !body.destination || !body.mode) {
      return NextResponse.json(
        { error: "Missing required fields: origin, destination, mode" },
        { status: 400 }
      );
    }
    
    // Request the route
    const result = await requestRoute(body);
    
    // Return simplified response
    return NextResponse.json({
      mode: result.mode,
      durationMinutes: Math.round(result.durationSeconds / 60),
      distanceMeters: result.distanceMeters,
    });
  } catch (error) {
    console.error("Routing estimate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to estimate route" },
      { status: 500 }
    );
  }
}

