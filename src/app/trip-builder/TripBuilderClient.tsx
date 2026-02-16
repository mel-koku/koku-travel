"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TripBuilderProvider, useTripBuilder } from "@/context/TripBuilderContext";
import { TripBuilderV2 } from "@/components/features/trip-builder";
import { GeneratingOverlay } from "@/components/features/trip-builder/GeneratingOverlay";
import { useAppState } from "@/state/AppState";
import type { Itinerary } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

type PlanApiResponse = {
  trip: { id: string };
  itinerary: Itinerary;
  validation: { valid: boolean; issues: string[] };
};

function TripBuilderV2Content({ sanityConfig }: { sanityConfig?: TripBuilderConfig }) {
  const router = useRouter();
  const { data, reset, setData } = useTripBuilder();
  const { createTrip } = useAppState();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/itinerary/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          builderData: data as TripBuilderData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate itinerary (${response.status})`);
      }

      const result: PlanApiResponse = await response.json();

      const cityNames = data.cities?.slice(0, 2).join(" & ") || "Japan";
      const startDate = data.dates?.start
        ? new Date(data.dates.start).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "";
      const tripName = startDate ? `${cityNames} Trip - ${startDate}` : `${cityNames} Trip`;

      const tripId = createTrip({
        name: tripName,
        itinerary: result.itinerary,
        builderData: data as TripBuilderData,
      });

      setData((prev) => ({ ...prev, savedLocationIds: [] }));
      reset();
      router.push(`/itinerary?trip=${tripId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsGenerating(false);
    }
  }, [data, createTrip, reset, setData, router]);

  return (
    <>
      <TripBuilderV2 onComplete={handleComplete} sanityConfig={sanityConfig} />

      {/* Cinematic generating overlay */}
      <AnimatePresence>
        {isGenerating && <GeneratingOverlay sanityConfig={sanityConfig} />}
      </AnimatePresence>

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-error px-4 py-3 text-white shadow-lg lg:bottom-8">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-2 rounded p-1 hover:bg-error/80"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function TripBuilderClient({ sanityConfig }: { sanityConfig?: TripBuilderConfig }) {
  return (
    <ErrorBoundary>
      <TripBuilderProvider>
        <TripBuilderV2Content sanityConfig={sanityConfig} />
      </TripBuilderProvider>
    </ErrorBoundary>
  );
}
