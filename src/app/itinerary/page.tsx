"use client";

import Link from "next/link";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ItineraryShell } from "@/components/features/itinerary/ItineraryShell";
import { Select } from "@/components/ui/Select";
import { useAppState } from "@/state/AppState";
import { MOCK_ITINERARY } from "@/data/mockItinerary";
import type { Itinerary } from "@/types/itinerary";
import { env } from "@/lib/env";

const formatDateLabel = (iso: string | undefined) => {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
};

export default function ItineraryPage() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const requestedTripId = searchParams.get("trip");
  const { trips, updateTripItinerary } = useAppState();
  const [userSelectedTripId, setUserSelectedTripId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Track mount state to prevent hydration mismatch
  // AppState loads from localStorage in useEffect, so trips may be empty on server
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (headingRef.current) {
      headingRef.current.focus();
    }
  }, []);

  const selectedTripId = useMemo(() => {
    if (!trips.length) {
      return null;
    }
    if (
      userSelectedTripId &&
      trips.some((trip) => trip.id === userSelectedTripId)
    ) {
      return userSelectedTripId;
    }
    if (
      requestedTripId &&
      trips.some((trip) => trip.id === requestedTripId)
    ) {
      return requestedTripId;
    }
    return trips[0]?.id ?? null;
  }, [requestedTripId, trips, userSelectedTripId]);

  const isUsingMock = trips.length === 0 && env.useMockItinerary;

  const handleTripChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextId = event.target.value || null;
      setUserSelectedTripId(nextId);

      const params = new URLSearchParams(searchParamsString);
      if (nextId) {
        params.set("trip", nextId);
      } else {
        params.delete("trip");
      }
      const query = params.toString();
      router.replace(query.length > 0 ? `/itinerary?${query}` : "/itinerary", {
        scroll: false,
      });
    },
    [router, searchParamsString],
  );

  const handleItineraryChange = useCallback(
    (next: Itinerary) => {
      if (!selectedTripId) {
        return;
      }
      updateTripItinerary(selectedTripId, next);
    },
    [selectedTripId, updateTripItinerary],
  );

  const selectedTrip = selectedTripId
    ? trips.find((trip) => trip.id === selectedTripId)
    : null;

  const itineraryOptions = useMemo(
    () =>
      trips.map((trip) => ({
        label: trip.name,
        value: trip.id,
      })),
    [trips],
  );

  const activeItinerary: Itinerary | null = selectedTrip
    ? selectedTrip.itinerary
    : isUsingMock
      ? MOCK_ITINERARY
      : null;

  const createdLabel =
    selectedTrip?.createdAt ? formatDateLabel(selectedTrip.createdAt) : null;
  const updatedLabel =
    selectedTrip?.updatedAt && selectedTrip.updatedAt !== selectedTrip?.createdAt
      ? formatDateLabel(selectedTrip.updatedAt)
      : null;

  // Wait for mount to prevent hydration mismatch
  // AppState loads from localStorage which is only available on client
  if (!isMounted) {
    return (
      <div className="p-16 text-center text-gray-600">
        <p>Loading...</p>
      </div>
    );
  }

  if (!activeItinerary) {
    return (
      <div className="p-16 text-center text-gray-600">
        <p>No saved itineraries yet. Confirm a trip in the builder to see it here.</p>
        <Link href="/trip-builder" className="text-indigo-600 underline">
          Go to Trip Builder
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 py-6 sm:py-8 md:py-10">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:text-3xl"
        >
          {trips.length > 1 ? "Your Itineraries" : "Your Itinerary"}
        </h1>
        {isUsingMock ? (
          <p className="mt-2 text-sm text-gray-500 sm:mt-3">
            Showing mock itinerary for development. Build a trip to see your personalized plan.
          </p>
        ) : null}
        {trips.length > 0 ? (
          <div className="mt-4 flex flex-col gap-4 sm:mt-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                Choose a saved trip to review or continue planning.
              </p>
              {createdLabel ? (
                <p className="text-xs text-gray-400">
                  Saved {createdLabel}
                  {updatedLabel ? ` · Updated ${updatedLabel}` : ""}
                </p>
              ) : null}
            </div>
            <div className="w-full md:max-w-xs">
              <Select
                value={selectedTripId ?? ""}
                onChange={handleTripChange}
                options={itineraryOptions}
                placeholder="Select a trip"
              />
            </div>
          </div>
        ) : null}
      </div>
      <ItineraryShell
        key={selectedTrip?.id ?? "mock-itinerary"}
        itinerary={activeItinerary}
        tripId={selectedTrip?.id ?? "mock"}
        onItineraryChange={selectedTrip ? handleItineraryChange : undefined}
      />
    </div>
  );
}
