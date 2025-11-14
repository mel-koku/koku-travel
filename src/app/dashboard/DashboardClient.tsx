"use client";

import Link from "next/link";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAppState } from "@/state/AppState";
import { DashboardItineraryPreview } from "@/components/features/itinerary/DashboardItineraryPreview";

type StoredTrip = ReturnType<typeof useAppState>["trips"][number];

const TOAST_DURATION_MS = 8000;

type DashboardClientProps = {
  initialUser: {
    id: string;
    email?: string | null;
  };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DashboardClient({ initialUser }: DashboardClientProps) {
  const { user, favorites, guideBookmarks, trips, deleteTrip, restoreTrip } = useAppState();
  const [userSelectedTripId, setUserSelectedTripId] = useState<string | null>(null);
  const [pendingUndo, setPendingUndo] = useState<null | { trip: StoredTrip }>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tripsWithItinerary = useMemo(() => {
    if (!trips.length) {
      return [];
    }
    return [...trips]
      .filter((trip) => (trip.itinerary?.days?.length ?? 0) > 0)
      .sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [trips]);

  const selectedTripId = useMemo(() => {
    if (!tripsWithItinerary.length) {
      return null;
    }
    if (
      userSelectedTripId &&
      tripsWithItinerary.some((trip) => trip.id === userSelectedTripId)
    ) {
      return userSelectedTripId;
    }
    return tripsWithItinerary[0]?.id ?? null;
  }, [tripsWithItinerary, userSelectedTripId]);

  const activeTrip =
    selectedTripId && tripsWithItinerary.length
      ? tripsWithItinerary.find((trip) => trip.id === selectedTripId) ?? tripsWithItinerary[0]
      : null;

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleDeleteTrip = useCallback(
    (tripId: string) => {
      const trip = trips.find((item) => item.id === tripId);
      if (!trip) {
        return;
      }
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      deleteTrip(tripId);
      setPendingUndo({ trip });
      timeoutRef.current = setTimeout(() => {
        setPendingUndo(null);
        timeoutRef.current = null;
      }, TOAST_DURATION_MS);
    },
    [deleteTrip, trips],
  );

  const handleUndo = useCallback(() => {
    if (!pendingUndo) {
      return;
    }
    restoreTrip(pendingUndo.trip);
    setPendingUndo(null);
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [pendingUndo, restoreTrip]);

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <section className="mx-auto max-w-7xl px-8 pt-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {user.displayName || "Guest"}.</p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs uppercase text-gray-500">Favorites</p>
              <p className="text-2xl font-semibold text-gray-900">{favorites.length}</p>
              <Link
                href={favorites.length > 0 ? "/favorites" : "/explore"}
                className="mt-2 inline-block text-sm text-indigo-600"
              >
                {favorites.length > 0 ? "View favorites →" : "Explore places →"}
              </Link>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs uppercase text-gray-500">Bookmarked Guides</p>
              <p className="text-2xl font-semibold text-gray-900">{guideBookmarks.length}</p>
              <Link href="/guides/bookmarks" className="mt-2 inline-block text-sm text-indigo-600">
                View bookmarks →
              </Link>
            </div>
          </div>
        </div>

        {activeTrip ? (
          <DashboardItineraryPreview
            trip={activeTrip}
            availableTrips={tripsWithItinerary}
            selectedTripId={activeTrip.id}
            onSelectTrip={setUserSelectedTripId}
            onDeleteTrip={handleDeleteTrip}
          />
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">No itineraries saved yet</h2>
            <p className="mt-2 text-sm text-gray-500">
              Build a trip to generate your first itinerary. Once it&apos;s saved, you&apos;ll see a preview
              here with quick access to view the full plan.
            </p>
            <Link
              href="/trip-builder"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Start planning
            </Link>
          </div>
        )}
      </section>

      {pendingUndo ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 px-4">
          <div className="pointer-events-auto flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg ring-1 ring-indigo-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">Itinerary deleted</p>
              <p className="text-xs text-gray-600">
                {pendingUndo.trip.name} was removed. Undo within 8 seconds to restore.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUndo}
              className="self-start rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Undo
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

