import { NextRequest, NextResponse } from "next/server";
import { optimizeRouteOrder } from "@/lib/routeOptimizer";
import type { Itinerary, ItineraryActivity } from "@/types/itinerary";
import type { EntryPoint } from "@/types/trip";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { day, startPoint } = body as {
    day: Itinerary["days"][number];
    startPoint?: EntryPoint;
  };

  if (!day?.activities) {
    return NextResponse.json({ error: "Invalid day data" }, { status: 400 });
  }

  const result = optimizeRouteOrder(day.activities, startPoint);

  if (!result.orderChanged) {
    return NextResponse.json({ optimized: false, day });
  }

  const activityMap = new Map(day.activities.map(a => [a.id, a]));
  const reorderedActivities = result.order
    .map(id => activityMap.get(id))
    .filter((a): a is ItineraryActivity => a !== undefined);

  return NextResponse.json({
    optimized: true,
    day: { ...day, activities: reorderedActivities },
    stats: {
      optimizedCount: result.optimizedCount,
      skippedCount: result.skippedCount,
    },
  });
}
