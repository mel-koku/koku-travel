import { notFound } from "next/navigation";
import { verifyPrintToken } from "@/lib/pdf/printToken";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { fetchTripById } from "@/services/sync/tripSync";
import type { PrintEnrichmentMap } from "@/app/api/locations/print-enrichment/route";
import type { StoredTrip } from "@/services/trip/types";
import PrintBookClient from "./PrintBookClient";
import "../print.css";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RESERVATION_LEVELS = new Set(["required", "recommended"]);

/**
 * Server-rendered print view consumed by headless Chromium during
 * server-side PDF generation. Auth is via HMAC token, not the user's
 * session — Chromium doesn't carry session cookies.
 *
 * NOT intended for direct user navigation. The normal print flow lives
 * at /print/trip/[id] (client component) and is unchanged.
 */
export default async function PrintPdfPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!token) notFound();
  const payload = verifyPrintToken(token);
  if (!payload || payload.tripId !== id) notFound();

  const admin = getServiceRoleClient();

  // Ownership is enforced via payload.userId — fetchTripById filters by user_id.
  const tripResult = await fetchTripById(admin, payload.userId, payload.tripId);
  if (!tripResult.success || !tripResult.data) notFound();
  const trip = tripResult.data;

  const enrichment = await loadEnrichment(admin, trip);

  return <PrintBookClient trip={trip} enrichment={enrichment} />;
}

async function loadEnrichment(
  admin: ReturnType<typeof getServiceRoleClient>,
  trip: StoredTrip,
): Promise<PrintEnrichmentMap> {
  const locationIds = new Set<string>();
  for (const day of trip.itinerary.days) {
    for (const activity of day.activities) {
      if (activity.kind === "place" && activity.locationId) {
        locationIds.add(activity.locationId);
      }
    }
  }
  if (locationIds.size === 0) return {};

  const { data, error } = await admin
    .from("locations")
    .select("id, name_japanese, nearest_station, cash_only, reservation_info")
    .in("id", Array.from(locationIds));

  if (error || !data) return {};

  const map: PrintEnrichmentMap = {};
  for (const row of data as Array<{
    id: string;
    name_japanese: string | null;
    nearest_station: string | null;
    cash_only: boolean | null;
    reservation_info: string | null;
  }>) {
    map[row.id] = {
      nameJapanese: row.name_japanese ?? undefined,
      nearestStation: row.nearest_station ?? undefined,
      cashOnly: row.cash_only ?? undefined,
      reservationInfo: RESERVATION_LEVELS.has(row.reservation_info ?? "")
        ? (row.reservation_info as "required" | "recommended")
        : undefined,
    };
  }
  return map;
}
