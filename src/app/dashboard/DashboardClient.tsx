"use client";

import Link from "next/link";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

import { useAppState } from "@/state/AppState";
import { DashboardItineraryPreview } from "@/components/features/itinerary/DashboardItineraryPreview";
import IdentityBadge from "@/components/ui/IdentityBadge";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { syncLocalToCloudOnce } from "@/lib/accountSync";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

type StoredTrip = ReturnType<typeof useAppState>["trips"][number];

const TOAST_DURATION_MS = 8000;

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
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<string>("");
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [showAccountSection, setShowAccountSection] = useState(false);

  // Monitor auth state changes and load initial auth state
  useEffect(() => {
    if (!supabase) {
      setIsLoadingAuth(false);
      return;
    }
    let isActive = true;
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
  }, [supabase]);

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

        setStatus("Syncing your local data to cloud…");
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
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) return;
        await supabase.from("profiles").upsert({
          id: authUser.id,
          display_name: name,
        });
      }, 500),
    [supabase]
  );

  function onNameChange(v: string) {
    setUser({ displayName: v });
    saveProfile(v);
  }

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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 sm:pb-20 md:pb-24">
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8 md:px-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-md sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 sm:text-xl">Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
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
          <div className={`mt-6 grid grid-cols-1 gap-4 ${(showAccountSection || !isAuthenticated) ? 'lg:grid-cols-2' : ''}`}>
            {/* Left Column: Account Management Section */}
            {(showAccountSection || !isAuthenticated) && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 space-y-6">
                {supabaseUnavailable && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Cloud sync is disabled because Supabase credentials are not configured. Set
                    <code className="mx-1 rounded bg-amber-100 px-1 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code>
                    and
                    <code className="mx-1 rounded bg-amber-100 px-1 py-0.5">
                      NEXT_PUBLIC_SUPABASE_ANON_KEY
                    </code>
                    to enable account features.
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Account</h2>
                  {isAuthenticated && supabase && (
                    <button
                      onClick={() => supabase.auth.signOut()}
                      className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Sign out
                    </button>
                  )}
                </div>

                {isAuthenticated ? (
                  <>
                    <IdentityBadge />
                    <label className="text-sm text-gray-700 block">
                      Display name
                      <input
                        className="mt-1 w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={user.displayName}
                        onChange={(e) => onNameChange(e.target.value)}
                      />
                    </label>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {isLoadingProfile || isLoadingRefresh ? (
                          <span className="flex items-center gap-2">
                            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-indigo-600 border-r-transparent"></span>
                            {status || "Loading..."}
                          </span>
                        ) : (
                          status
                        )}
                      </div>
                      <button
                        onClick={clearAllLocalData}
                        disabled={isLoadingProfile || isLoadingRefresh}
                        className="h-10 rounded-lg border border-red-200 bg-red-50 px-4 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Clear local data
                      </button>
                    </div>
                  </>
                ) : (
                  <EmailForm supabase={supabase} supabaseUnavailable={supabaseUnavailable} />
                )}
              </div>
            )}

            {/* Right Column: Stats Cards */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs uppercase text-gray-500">Favorites</p>
                <p className="mt-1 text-xl font-semibold text-gray-900 sm:text-2xl">{favorites.length}</p>
                <Link
                  href={favorites.length > 0 ? "/favorites" : "/explore"}
                  className="mt-2 inline-block min-h-[44px] text-sm text-indigo-600 hover:text-indigo-700"
                >
                  {favorites.length > 0 ? "View favorites →" : "Explore places →"}
                </Link>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs uppercase text-gray-500">Bookmarked Guides</p>
                <p className="mt-1 text-xl font-semibold text-gray-900 sm:text-2xl">{guideBookmarks.length}</p>
                <Link href="/guides/bookmarks" className="mt-2 inline-block min-h-[44px] text-sm text-indigo-600 hover:text-indigo-700">
                  View bookmarks →
                </Link>
              </div>
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
    </div>
  );
}

type EmailFormProps = {
  supabase: ReturnType<typeof createClient> | null;
  supabaseUnavailable: boolean;
};

function EmailForm({ supabase, supabaseUnavailable }: EmailFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  /**
   * Gets the redirect URL for magic link authentication.
   * Uses NEXT_PUBLIC_SITE_URL in production, falls back to location.origin for development.
   */
  function getRedirectUrl(): string {
    const siteUrl = env.siteUrl;
    if (siteUrl) {
      return `${siteUrl}/auth/callback`;
    }
    // Fallback to current origin (for development)
    if (typeof window !== "undefined") {
      return `${window.location.origin}/auth/callback`;
    }
    // Server-side fallback (shouldn't happen in client component)
    return "/auth/callback";
  }

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setStatus("Supabase is not configured. Unable to send sign-in links.");
      return;
    }
    setStatus("Sending magic link…");
    const redirectUrl = getRedirectUrl();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl },
    });
    setStatus(error ? `Error: ${error.message}` : "Check your email for the sign-in link.");
  }

  return (
    <form className="grid grid-cols-1 gap-4" onSubmit={sendMagicLink}>
      <label className="text-sm text-gray-700">
        Email for magic link
        <input
          type="email"
          required
          disabled={supabaseUnavailable}
          className="mt-1 w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <button
        type="submit"
        disabled={supabaseUnavailable}
        className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Send sign-in link
      </button>
      <div className="text-xs text-gray-500">{status}</div>
    </form>
  );
}

function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  ms = 300,
): (...args: TArgs) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: TArgs) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn(...args);
    }, ms);
  };
}

