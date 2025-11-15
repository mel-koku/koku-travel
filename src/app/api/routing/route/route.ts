import { NextRequest, NextResponse } from "next/server";
import { requestRoute } from "@/lib/routing";
import type { RoutingRequest } from "@/lib/routing/types";

/**
 * POST /api/routing/route
 * 
 * Gets full route details including path, instructions, and timing.
 * Returns complete route information for display.
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
    
    // Extract instructions from legs
    const instructions: string[] = [];
    result.legs.forEach((leg) => {
      leg.steps?.forEach((step) => {
        if (step.instruction) {
          instructions.push(step.instruction);
        }
      });
    });
    
    // Calculate arrival time if departure time is provided
    let arrivalTime: string | undefined;
    if (body.departureTime) {
      const departure = parseTime(body.departureTime, body.timezone);
      if (departure) {
        const arrival = new Date(departure.getTime() + result.durationSeconds * 1000);
        arrivalTime = formatTime(arrival, body.timezone);
      }
    }
    
    // Return full route response
    return NextResponse.json({
      mode: result.mode,
      durationMinutes: Math.round(result.durationSeconds / 60),
      distanceMeters: result.distanceMeters,
      path: result.geometry,
      instructions: instructions.length > 0 ? instructions : undefined,
      arrivalTime,
      departureTime: body.departureTime,
    });
  } catch (error) {
    console.error("Routing route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get route" },
      { status: 500 }
    );
  }
}

function parseTime(timeStr: string, timezone?: string): Date | null {
  try {
    // Try ISO string first
    if (timeStr.includes("T") || timeStr.includes("Z")) {
      return new Date(timeStr);
    }
    
    // Try HH:MM format - assume today in the timezone
    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match && match[1] && match[2]) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const now = new Date();
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
      return date;
    }
    
    return new Date(timeStr);
  } catch {
    return null;
  }
}

function formatTime(date: Date, timezone?: string): string {
  // Format as HH:MM in local time or specified timezone
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

