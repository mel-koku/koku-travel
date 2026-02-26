"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TripBuilderProvider, useTripBuilder } from "@/context/TripBuilderContext";
import { TripBuilderB } from "@b/features/trip-builder/TripBuilderB";
import { GeneratingOverlayB } from "@b/features/trip-builder/GeneratingOverlayB";
import { useAppState } from "@/state/AppState";
import type { Itinerary } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

type PlanApiResponse = {
  trip: { id: string };
  itinerary: Itinerary;
  dayIntros?: Record<string, string>;
  validation: { valid: boolean; issues: string[] };
};

function TripBuilderBContent({
  sanityConfig,
}: {
  sanityConfig?: TripBuilderConfig;
}) {
  const router = useRouter();
  const { data, reset } = useTripBuilder();
  const { createTrip, saved } = useAppState();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      let contentContext: TripBuilderData["contentContext"];
      try {
        const raw = localStorage.getItem("koku:content-context");
        if (raw) {
          contentContext = JSON.parse(raw);
        }
      } catch {
        // Malformed JSON — ignore
      }

      const builderData: TripBuilderData = {
        ...(data as TripBuilderData),
        ...(contentContext ? { contentContext } : {}),
      };

      const response = await fetch("/api/itinerary/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          builderData,
          savedIds: saved.length > 0 ? saved : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Failed to generate itinerary (${response.status})`,
        );
      }

      const result: PlanApiResponse = await response.json();

      const cityNames = data.cities?.slice(0, 2).map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(" & ") || "Japan";
      const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const dateRange = data.dates?.start && data.dates?.end
        ? `${fmt(data.dates.start)} - ${fmt(data.dates.end)}`
        : data.dates?.start ? fmt(data.dates.start) : "";
      const tripName = dateRange
        ? `${cityNames} Trip - ${dateRange}`
        : `${cityNames} Trip`;

      const tripId = createTrip({
        name: tripName,
        itinerary: result.itinerary,
        builderData: data as TripBuilderData,
        dayIntros: result.dayIntros,
      });

      localStorage.removeItem("koku:content-context");
      reset();
      router.push(`/b/itinerary?trip=${tripId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
      setIsGenerating(false);
    }
  }, [data, createTrip, reset, router, saved]);

  return (
    <>
      <TripBuilderB onComplete={handleComplete} sanityConfig={sanityConfig} />

      <AnimatePresence>
        {isGenerating && <GeneratingOverlayB sanityConfig={sanityConfig} />}
      </AnimatePresence>

      {error && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[var(--error)] px-4 py-3 text-white shadow-lg lg:bottom-8">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-2 rounded p-1 hover:bg-white/20"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function TripBuilderClientB({
  sanityConfig,
}: {
  sanityConfig?: TripBuilderConfig;
}) {
  return (
    <ErrorBoundary>
      <TripBuilderProvider>
        <Suspense>
          <TripBuilderBContent sanityConfig={sanityConfig} />
        </Suspense>
      </TripBuilderProvider>
    </ErrorBoundary>
  );
}
