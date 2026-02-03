"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";

import { useAppState } from "@/state/AppState";
import { DashboardItineraryPreview } from "@/components/features/itinerary/DashboardItineraryPreview";
import IdentityBadge from "@/components/ui/IdentityBadge";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { syncLocalToCloudOnce } from "@/lib/accountSync";
import { logger } from "@/lib/logger";
import { sanitizeString } from "@/lib/api/sanitization";
import { debounce } from "@/lib/utils";
import { TOAST_DURATION_MS, MAX_DISPLAY_NAME_LENGTH } from "@/lib/constants";
import { AccountSection } from "./components/AccountSection";
import { StatsSection } from "./components/StatsSection";

type StoredTrip = ReturnType<typeof useAppState>["trips"][number];

type DashboardClientProps = {
  initialAuthUser: {
    id: string;
    email?: string | null;
  } | null;
};

export function DashboardClient({ initialAuthUser }: DashboardClientProps) {
  const { user, setUser, favorites, guideBookmarks, trips, deleteTrip, restoreTrip, clearAllLocalData, refreshFromSupabase, isLoadingRefresh } = useAppState();
  const [sessionUserId, setSessionUserId] = useState<string | null>(initialAuthUser?.id ?? null);
  const [userSelectedTripId, setUserSelectedTripId] = useState<string | null>(null);
  const [pendingUndo, setPendingUndo] = useState<null | { trip: StoredTrip }>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();
  const [status, setStatus] = useState<string>("");
  // Only show loading if we don't have initial auth data from server
  const [isLoadingAuth, setIsLoadingAuth] = useState(!initialAuthUser);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [showAccountSection, setShowAccountSection] = useState(false);

  // Monitor auth state changes and load initial auth state
  useEffect(() => {
    if (!supabase) {
      setIsLoadingAuth(false);
      return;
    }
    let isActive = true;

    // Only fetch auth if we don't have initial data from server
    if (!initialAuthUser) {
      (async () => {
        try {
          const { data } = await supabase.auth.getUser();
          if (isActive) {
            setSessionUserId(data.user?.id ?? null);
            setIsLoadingAuth(false);
          }
        } catch (error) {
          logger.warn("Failed to read Supabase session", { error });
          if (isActive) {
            setIsLoadingAuth(false);
          }
        }
      })();
    }

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (isActive) {
          setSessionUserId(session?.user?.id ?? null);
        }
      },
    );

    return () => {
      isActive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, initialAuthUser]);

  // load profile from Supabase when signed in
  useEffect(() => {
    if (!sessionUserId || !supabase) return;
    setIsLoadingProfile(true);
    (async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", sessionUserId)
          .maybeSingle();

        const displayName =
          prof?.display_name ??
          authUser?.user_metadata?.full_name ??
          authUser?.email?.split("@")[0] ??
          "Guest";

        setUser({ displayName });

        if (!prof) {
          await supabase.from("profiles").upsert({
            id: sessionUserId,
            display_name: displayName,
          });
        }

        setStatus("Syncing your local data to cloud...");
        const syncResult = await syncLocalToCloudOnce();
        if (syncResult?.ok === false) {
          setStatus("");
          return;
        }
        await refreshFromSupabase();
        setStatus("Sync complete.");
        // Show account section after successful sign-in
        setShowAccountSection(true);
      } catch (error) {
        logger.error("Account sync failed", error);
        setStatus("Sync failed. Please try again.");
      } finally {
        setIsLoadingProfile(false);
      }
    })();
  }, [sessionUserId, supabase, setUser, refreshFromSupabase]);

  // save profile edits (debounced)
  const saveProfile = useMemo(
    () =>
      debounce(async (name: string) => {
        if (!supabase) {
          return;
        }
        // Sanitize before saving to database
        const sanitizedName = sanitizeString(name, MAX_DISPLAY_NAME_LENGTH);
        if (!sanitizedName) {
          return;
        }
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) return;
        await supabase.from("profiles").upsert({
          id: authUser.id,
          display_name: sanitizedName,
        });
      }, 500),
    [supabase]
  );

  const onNameChange = useCallback((v: string) => {
    // Sanitize display name to prevent XSS attacks
    const sanitized = v.trim() === "" ? "" : sanitizeString(v, MAX_DISPLAY_NAME_LENGTH) ?? v.substring(0, MAX_DISPLAY_NAME_LENGTH);
    setUser({ displayName: sanitized });
    if (sanitized.trim()) {
      saveProfile(sanitized);
    }
  }, [setUser, saveProfile]);

  const isAuthenticated = Boolean(sessionUserId);
  const supabaseUnavailable = !supabase;

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

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-primary border-r-transparent"></div>
          <p className="text-sm text-foreground-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const shouldShowAccountSection = showAccountSection || !isAuthenticated;

  return (
    <div className="min-h-screen bg-surface pb-16 sm:pb-20 md:pb-24">
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8 md:px-8">
        <div className="rounded-2xl border border-border bg-background p-4 shadow-md sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-charcoal sm:text-xl">Dashboard</h1>
              <p className="mt-1 text-sm text-stone">
                {isAuthenticated
                  ? `Welcome back, ${user.displayName || "Guest"}.`
                  : `Welcome, ${user.displayName || "Guest"}. Sign in to sync your data across devices.`}
              </p>
            </div>
            {isAuthenticated && (
              <button
                onClick={() => setShowAccountSection(!showAccountSection)}
                className="hidden sm:inline-flex"
              >
                <IdentityBadge />
              </button>
            )}
          </div>

          {/* Two-column layout: Account on left, Stats on right */}
          <div className={`mt-6 grid grid-cols-1 gap-4 ${shouldShowAccountSection ? 'lg:grid-cols-2' : ''}`}>
            {/* Left Column: Account Management Section */}
            {shouldShowAccountSection && (
              <AccountSection
                isAuthenticated={isAuthenticated}
                supabase={supabase}
                supabaseUnavailable={supabaseUnavailable}
                displayName={user.displayName}
                isLoadingProfile={isLoadingProfile}
                isLoadingRefresh={isLoadingRefresh}
                status={status}
                onNameChange={onNameChange}
                onClearLocalData={clearAllLocalData}
              />
            )}

            {/* Right Column: Stats Cards */}
            <StatsSection
              favoritesCount={favorites.length}
              guideBookmarksCount={guideBookmarks.length}
            />
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
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-background p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-charcoal">No itineraries saved yet</h2>
            <p className="mt-2 text-sm text-stone">
              Build a trip to generate your first itinerary. Once it&apos;s saved, you&apos;ll see a preview
              here with quick access to view the full plan.
            </p>
            <Link
              href="/trip-builder"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            >
              Start planning
            </Link>
          </div>
        )}
      </section>

      {pendingUndo ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 px-4">
          <div className="pointer-events-auto flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 shadow-lg ring-1 ring-brand-primary/20">
            <div>
              <p className="text-sm font-semibold text-charcoal">Itinerary deleted</p>
              <p className="text-xs text-foreground-secondary">
                {pendingUndo.trip.name} was removed. Undo within 8 seconds to restore.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUndo}
              className="self-start rounded-full bg-brand-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-brand-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            >
              Undo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
