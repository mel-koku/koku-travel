"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";

import { useAppState } from "@/state/AppState";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { syncLocalToCloudOnce } from "@/lib/accountSync";
import { logger } from "@/lib/logger";
import { sanitizeString } from "@/lib/api/sanitization";
import { debounce } from "@/lib/utils";
import { TOAST_DURATION_MS, MAX_DISPLAY_NAME_LENGTH } from "@/lib/constants";
import type { PagesContent } from "@/types/sanitySiteContent";

import { DashboardHeaderB } from "./DashboardHeaderB";
import { StatsSectionB } from "./StatsSectionB";
import { TripsSectionB } from "./TripsSectionB";
import { AccountSectionB } from "./AccountSectionB";

const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

type StoredTrip = ReturnType<typeof useAppState>["trips"][number];

type DashboardClientBProps = {
  initialAuthUser: {
    id: string;
    email?: string | null;
  } | null;
  content?: PagesContent;
};

export function DashboardClientB({ initialAuthUser, content }: DashboardClientBProps) {
  const {
    user,
    setUser,
    saved,
    guideBookmarks,
    trips,
    deleteTrip,
    restoreTrip,
    clearAllLocalData,
    refreshFromSupabase,
    isLoadingRefresh,
  } = useAppState();

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

  // Load profile from Supabase when signed in
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

        setStatus("Syncing your trips and saves\u2026");
        const syncResult = await syncLocalToCloudOnce();
        if (syncResult?.ok === false) {
          setStatus("");
          return;
        }
        await refreshFromSupabase();
        setStatus("All synced.");
        setShowAccountSection(true);
      } catch (error) {
        logger.error("Account sync failed", error);
        setStatus("Sync didn\u2019t go through. Refresh to try again.");
      } finally {
        setIsLoadingProfile(false);
      }
    })();
  }, [sessionUserId, supabase, setUser, refreshFromSupabase]);

  // Save profile edits (debounced)
  const saveProfile = useMemo(
    () =>
      debounce(async (name: string) => {
        if (!supabase) return;
        const sanitizedName = sanitizeString(name, MAX_DISPLAY_NAME_LENGTH);
        if (!sanitizedName) return;
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) return;
        await supabase.from("profiles").upsert({
          id: authUser.id,
          display_name: sanitizedName,
        });
      }, 500),
    [supabase],
  );

  const onNameChange = useCallback(
    (v: string) => {
      const sanitized =
        v.trim() === ""
          ? ""
          : sanitizeString(v, MAX_DISPLAY_NAME_LENGTH) ?? v.substring(0, MAX_DISPLAY_NAME_LENGTH);
      setUser({ displayName: sanitized });
      if (sanitized.trim()) {
        saveProfile(sanitized);
      }
    },
    [setUser, saveProfile],
  );

  const isAuthenticated = Boolean(sessionUserId);
  const supabaseUnavailable = !supabase;

  const tripsWithItinerary = useMemo(() => {
    if (!trips.length) return [];
    return [...trips]
      .filter((trip) => (trip.itinerary?.days?.length ?? 0) > 0)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [trips]);

  const selectedTripId = useMemo(() => {
    if (!tripsWithItinerary.length) return null;
    if (userSelectedTripId && tripsWithItinerary.some((trip) => trip.id === userSelectedTripId)) {
      return userSelectedTripId;
    }
    return tripsWithItinerary[0]?.id ?? null;
  }, [tripsWithItinerary, userSelectedTripId]);

  const activeTrip =
    selectedTripId && tripsWithItinerary.length
      ? (tripsWithItinerary.find((trip) => trip.id === selectedTripId) ?? tripsWithItinerary[0] ?? null)
      : null;

  // Cleanup timeout on unmount
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
      if (!trip) return;
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
    if (!pendingUndo) return;
    restoreTrip(pendingUndo.trip);
    setPendingUndo(null);
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [pendingUndo, restoreTrip]);

  // Loading state
  if (isLoadingAuth) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--primary)] border-r-transparent" />
          <p className="text-sm text-[var(--muted-foreground)]">Pulling up your trips\u2026</p>
        </div>
      </div>
    );
  }

  const shouldShowAccountSection = showAccountSection || !isAuthenticated;
  const displayName = user.displayName || "Guest";

  return (
    <div className="min-h-[100dvh] bg-[var(--background)]">
      <DashboardHeaderB
        name={displayName}
        subtitle={content?.dashboardSubtitle ?? "Your trips, saved places, and plans in progress."}
      />

      {/* Stats */}
      <StatsSectionB
        savedCount={saved.length}
        guideBookmarksCount={guideBookmarks.length}
        tripsCount={tripsWithItinerary.length}
      />

      {/* Trips */}
      <TripsSectionB
        trips={tripsWithItinerary}
        activeTrip={activeTrip}
        selectedTripId={selectedTripId}
        onSelectTrip={setUserSelectedTripId}
        onDeleteTrip={handleDeleteTrip}
      />

      {/* Account */}
      {shouldShowAccountSection && (
        <section className="py-8 sm:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, ease: bEase }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                {content?.dashboardAccountEyebrow ?? "Account"}
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-2xl">
                {content?.dashboardAccountHeading ?? "Profile & Sync"}
              </h2>
            </motion.div>
            <div className="mt-6 max-w-2xl">
              <AccountSectionB
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
            </div>
          </div>
        </section>
      )}

      {/* Undo toast */}
      {pendingUndo && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 px-4 pb-[env(safe-area-inset-bottom)]">
          <div
            className="pointer-events-auto flex flex-col gap-3 rounded-2xl bg-[var(--card)] p-4"
            style={{ boxShadow: "var(--shadow-elevated)" }}
          >
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {content?.dashboardDeleteToastTitle ?? "Itinerary deleted"}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {pendingUndo.trip.name} was removed. Undo within 8 seconds to restore.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUndo}
              className="self-start rounded-xl bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            >
              {content?.dashboardUndoButton ?? "Undo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
