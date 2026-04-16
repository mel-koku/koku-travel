"use client";

import type { StoredTrip } from "@/services/trip/types";
import type { PrintEnrichmentMap } from "@/app/api/locations/print-enrichment/route";
import { PrintBook } from "@/components/print/PrintBook";

type Props = {
  trip: StoredTrip;
  enrichment: PrintEnrichmentMap;
};

/**
 * Client wrapper so PrintBook renders in the same execution context it
 * was designed for (client components with hooks work as-is).
 */
export default function PrintBookClient({ trip, enrichment }: Props) {
  return <PrintBook trip={trip} enrichment={enrichment} />;
}
