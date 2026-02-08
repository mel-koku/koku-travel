"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";

import { useAppState } from "@/state/AppState";
import { DashboardItineraryPreview } from "@/components/features/itinerary/DashboardItineraryPreview";
import { PageHeader } from "@/components/ui/PageHeader";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SplitText } from "@/components/ui/SplitText";
import { Magnetic } from "@/components/ui/Magnetic";
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
  const displayName = user.displayName || "Guest";

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        compact
        eyebrow="Welcome back"
        title={displayName}
        subtitle="Your trips, favorites, and bookmarks — all in one place."
      />

      {/* Stats Section */}
      <section className="bg-background py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.3em] text-brand-primary">Activity</p>
            <h2 className="mt-2 font-serif text-xl text-foreground sm:text-2xl">At a Glance</h2>
          </ScrollReveal>
          <div className="mt-8">
            <StatsSection
              favoritesCount={favorites.length}
              guideBookmarksCount={guideBookmarks.length}
            />
          </div>
        </div>
      </section>

      {/* Trips Section */}
      <section className="bg-surface py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.3em] text-brand-primary">Recent</p>
            <h2 className="mt-2 font-serif text-xl text-foreground sm:text-2xl">Your Trips</h2>
          </ScrollReveal>

          <div className="mt-8">
            {activeTrip ? (
              <ScrollReveal delay={0.1} distance={20}>
                <DashboardItineraryPreview
                  trip={activeTrip}
                  availableTrips={tripsWithItinerary}
                  selectedTripId={activeTrip.id}
                  onSelectTrip={setUserSelectedTripId}
                  onDeleteTrip={handleDeleteTrip}
                />
              </ScrollReveal>
            ) : (
              <ScrollReveal delay={0.1} distance={20}>
                <div className="flex flex-col items-center py-16 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-stone/40">
                    <svg
                      className="h-8 w-8 text-stone/50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                    </svg>
                  </div>

                  <SplitText
                    as="h3"
                    className="mt-6 justify-center font-serif text-xl text-foreground sm:text-2xl"
                    splitBy="word"
                    animation="clipY"
                    staggerDelay={0.06}
                  >
                    No itineraries yet
                  </SplitText>

                  <ScrollReveal delay={0.3} distance={15}>
                    <p className="mt-3 max-w-sm text-sm text-foreground-secondary">
                      Build a trip to generate your first itinerary. Once it&apos;s saved,
                      you&apos;ll see a preview here.
                    </p>
                  </ScrollReveal>

                  <ScrollReveal delay={0.5} distance={10}>
                    <Magnetic>
                      <Link
                        href="/trip-builder"
                        className="mt-6 inline-flex items-center justify-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                      >
                        Start planning
                      </Link>
                    </Magnetic>
                  </ScrollReveal>
                </div>
              </ScrollReveal>
            )}
          </div>
        </div>
      </section>

      {/* Account Section (conditional) */}
      {shouldShowAccountSection && (
        <section className="bg-background py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <p className="text-xs uppercase tracking-[0.3em] text-brand-primary">Account</p>
              <h2 className="mt-2 font-serif text-xl text-foreground sm:text-2xl">Profile & Sync</h2>
            </ScrollReveal>
            <div className="mt-8 max-w-2xl">
              <ScrollReveal delay={0.1} distance={20}>
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
              </ScrollReveal>
            </div>
          </div>
        </section>
      )}

      {pendingUndo ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 px-4">
          <div className="pointer-events-auto flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 shadow-lg ring-1 ring-brand-primary/20">
            <div>
              <p className="text-sm font-semibold text-foreground">Itinerary deleted</p>
              <p className="text-xs text-foreground-secondary">
                {pendingUndo.trip.name} was removed. Undo within 8 seconds to restore.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUndo}
              className="self-start rounded-xl bg-brand-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-brand-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            >
              Undo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
