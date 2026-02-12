"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";

import { useAppState } from "@/state/AppState";
import { DashboardItineraryPreview } from "@/components/features/itinerary/DashboardItineraryPreview";
import { PageHeader } from "@/components/ui/PageHeader";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
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
import type { PagesContent } from "@/types/sanitySiteContent";

type StoredTrip = ReturnType<typeof useAppState>["trips"][number];

type DashboardClientProps = {
  initialAuthUser: {
    id: string;
    email?: string | null;
  } | null;
  content?: PagesContent;
};

export function DashboardClient({ initialAuthUser, content }: DashboardClientProps) {
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
      <div className="flex min-h-[100dvh] items-center justify-center bg-surface">
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
    <div className="min-h-[100dvh] bg-background">
      <PageHeader
        eyebrow={content?.dashboardEyebrow ?? "Home base"}
        title={displayName}
        subtitle={content?.dashboardSubtitle ?? "Your trips, saved places, and plans in progress."}
        imageUrl="https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=1920&q=80"
      />

      {/* Stats Section — standalone atmospheric band */}
      <StatsSection
        favoritesCount={favorites.length}
        guideBookmarksCount={guideBookmarks.length}
        tripsCount={tripsWithItinerary.length}
        content={{
          dashboardActivityEyebrow: content?.dashboardActivityEyebrow,
          dashboardActivityHeading: content?.dashboardActivityHeading,
        }}
      />

      {/* Trips Section */}
      <section id="trips" className="bg-surface py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.3em] text-brand-primary">{content?.dashboardTripsEyebrow ?? "Recent"}</p>
            <h2 className="mt-2 font-serif italic text-xl text-foreground sm:text-2xl">{content?.dashboardTripsHeading ?? "Your Trips"}</h2>
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
                {/* Atmospheric empty state */}
                <div className="relative overflow-hidden rounded-xl">
                  <div className="absolute inset-0">
                    <Image
                      src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&q=80"
                      alt=""
                      fill
                      className="object-cover opacity-20"
                      sizes="100vw"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-charcoal/70" />
                  </div>
                  <div className="texture-grain pointer-events-none absolute inset-0" />

                  <div className="relative flex flex-col items-center py-16 text-center px-6">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-white/20">
                      <svg
                        className="h-8 w-8 text-white/40"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                      </svg>
                    </div>

                    <h3 className="mt-6 font-serif italic text-xl text-white sm:text-2xl">
                      {content?.dashboardEmptyHeading ?? "No trips yet"}
                    </h3>

                    <ScrollReveal delay={0.3} distance={15}>
                      <p className="mt-3 max-w-sm text-sm text-white/70">
                        {content?.dashboardEmptyDescription ?? "Head to the trip builder to plan your first adventure. It'll appear here once it's ready."}
                      </p>
                    </ScrollReveal>

                    <ScrollReveal delay={0.5} distance={10}>
                      <Magnetic>
                        <Link
                          href="/trip-builder"
                          className="relative mt-6 inline-flex items-center justify-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                        >
                          <span className="absolute inset-0 rounded-xl bg-brand-primary/20 blur-xl" />
                          <span className="relative">{content?.dashboardPlanButton ?? "Start planning"}</span>
                        </Link>
                      </Magnetic>
                    </ScrollReveal>
                  </div>
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
              <p className="text-xs uppercase tracking-[0.3em] text-brand-primary">{content?.dashboardAccountEyebrow ?? "Account"}</p>
              <h2 className="mt-2 font-serif italic text-xl text-foreground sm:text-2xl">{content?.dashboardAccountHeading ?? "Profile & Sync"}</h2>
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
          <div className="pointer-events-auto flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 shadow-lg shadow-[0_0_20px_rgba(196,80,79,0.15)] ring-1 ring-brand-primary/20">
            <div>
              <p className="text-sm font-semibold text-foreground">{content?.dashboardDeleteToastTitle ?? "Itinerary deleted"}</p>
              <p className="text-xs text-foreground-secondary">
                {pendingUndo.trip.name} was removed. Undo within 8 seconds to restore.
              </p>
            </div>
            <Magnetic>
              <button
                type="button"
                onClick={handleUndo}
                className="self-start rounded-xl bg-brand-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-brand-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
              >
                {content?.dashboardUndoButton ?? "Undo"}
              </button>
            </Magnetic>
          </div>
        </div>
      ) : null}
    </div>
  );
}
