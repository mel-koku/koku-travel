"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useInView } from "framer-motion";

import { useAppState } from "@/state/AppState";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { syncLocalToCloudOnce } from "@/lib/accountSync";
import { logger } from "@/lib/logger";
import { sanitizeString } from "@/lib/api/sanitization";
import { debounce } from "@/lib/utils";
import { TOAST_DURATION_MS, MAX_DISPLAY_NAME_LENGTH } from "@/lib/constants";
import { groupTrips, getTripStatus, type TripLifecycleStatus } from "@/lib/trip/tripStatus";
import { env } from "@/lib/env";
import { cEase, fadeUp } from "@c/ui/motionC";
import type { PagesContent } from "@/types/sanitySiteContent";
import type { StoredTrip } from "@/state/AppState";
import type { FormEvent } from "react";

/* ── Animated Counter ── */
function AnimatedCounter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [inView, value]);

  return <span ref={ref}>{display.toLocaleString()}</span>;
}

/* ── Status Config ── */
const STATUS_CONFIG: Record<TripLifecycleStatus, { label: string; bg: string; text: string }> = {
  active: { label: "Active", bg: "color-mix(in srgb, var(--success) 12%, transparent)", text: "var(--success)" },
  upcoming: { label: "Upcoming", bg: "color-mix(in srgb, var(--primary) 12%, transparent)", text: "var(--primary)" },
  completed: { label: "Completed", bg: "color-mix(in srgb, var(--muted-foreground) 12%, transparent)", text: "var(--muted-foreground)" },
  planning: { label: "Planning", bg: "color-mix(in srgb, var(--warning) 12%, transparent)", text: "var(--warning)" },
};

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

/* ── Email Form ── */
function EmailFormC({ supabase, supabaseUnavailable }: {
  supabase: ReturnType<typeof createClient>;
  supabaseUnavailable: boolean;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  function getRedirectUrl(): string {
    const siteUrl = env.siteUrl;
    if (siteUrl) return `${siteUrl}/auth/callback`;
    if (typeof window !== "undefined") return `${window.location.origin}/auth/callback`;
    return "/auth/callback";
  }

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setStatus("Sign-in is temporarily unavailable.");
      return;
    }
    setStatus("Sending your sign-in link...");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: getRedirectUrl() },
    });
    setStatus(error ? `Error: ${error.message}` : "Sign-in link sent. Check your inbox.");
  }

  return (
    <form className="grid grid-cols-1 gap-4" onSubmit={sendMagicLink}>
      <label className="text-sm font-medium text-[var(--foreground)]">
        Email for magic link
        <input
          type="email"
          required
          disabled={supabaseUnavailable}
          className="mt-1.5 w-full h-12 border border-[var(--border)] bg-[var(--background)] px-3 text-base text-[var(--foreground)] transition focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <button
        type="submit"
        disabled={supabaseUnavailable}
        className="h-11 bg-[var(--primary)] px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        Send sign-in link
      </button>
      {status && (
        <p className="text-xs text-[var(--muted-foreground)]">{status}</p>
      )}
    </form>
  );
}

/* ── Main Dashboard ── */
type DashboardClientCProps = {
  initialAuthUser: { id: string; email?: string | null } | null;
  content?: PagesContent;
};

export function DashboardClientC({ initialAuthUser, content }: DashboardClientCProps) {
  const noMotion = !!useReducedMotion();
  const {
    user, setUser, saved, guideBookmarks, trips,
    deleteTrip, restoreTrip, clearAllLocalData,
    refreshFromSupabase, isLoadingRefresh,
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

  // Monitor auth state
  useEffect(() => {
    if (!supabase) { setIsLoadingAuth(false); return; }
    let isActive = true;
    if (!initialAuthUser) {
      (async () => {
        try {
          const { data } = await supabase.auth.getUser();
          if (isActive) { setSessionUserId(data.user?.id ?? null); setIsLoadingAuth(false); }
        } catch { if (isActive) setIsLoadingAuth(false); }
      })();
    }
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (isActive) setSessionUserId(session?.user?.id ?? null);
      },
    );
    return () => { isActive = false; sub.subscription.unsubscribe(); };
  }, [supabase, initialAuthUser]);

  // Load profile
  useEffect(() => {
    if (!sessionUserId || !supabase) return;
    setIsLoadingProfile(true);
    (async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const { data: prof } = await supabase
          .from("profiles").select("display_name").eq("id", sessionUserId).maybeSingle();
        const displayName = prof?.display_name ?? authUser?.user_metadata?.full_name ?? authUser?.email?.split("@")[0] ?? "Guest";
        setUser({ displayName });
        if (!prof) await supabase.from("profiles").upsert({ id: sessionUserId, display_name: displayName });
        setStatus("Syncing your trips and saves...");
        const syncResult = await syncLocalToCloudOnce();
        if (syncResult?.ok === false) { setStatus(""); return; }
        await refreshFromSupabase();
        setStatus("All synced.");
        setShowAccountSection(true);
      } catch (error) {
        logger.error("Account sync failed", error);
        setStatus("Sync didn't go through. Refresh to try again.");
      } finally { setIsLoadingProfile(false); }
    })();
  }, [sessionUserId, supabase, setUser, refreshFromSupabase]);

  const saveProfile = useMemo(
    () => debounce(async (name: string) => {
      if (!supabase) return;
      const sanitized = sanitizeString(name, MAX_DISPLAY_NAME_LENGTH);
      if (!sanitized) return;
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      await supabase.from("profiles").upsert({ id: authUser.id, display_name: sanitized });
    }, 500),
    [supabase],
  );

  const onNameChange = useCallback((v: string) => {
    const sanitized = v.trim() === "" ? "" : sanitizeString(v, MAX_DISPLAY_NAME_LENGTH) ?? v.substring(0, MAX_DISPLAY_NAME_LENGTH);
    setUser({ displayName: sanitized });
    if (sanitized.trim()) saveProfile(sanitized);
  }, [setUser, saveProfile]);

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
    if (userSelectedTripId && tripsWithItinerary.some((t) => t.id === userSelectedTripId)) return userSelectedTripId;
    return tripsWithItinerary[0]?.id ?? null;
  }, [tripsWithItinerary, userSelectedTripId]);

  const activeTrip = selectedTripId && tripsWithItinerary.length
    ? (tripsWithItinerary.find((t) => t.id === selectedTripId) ?? tripsWithItinerary[0] ?? null)
    : null;

  useEffect(() => {
    return () => { if (timeoutRef.current !== null) clearTimeout(timeoutRef.current); };
  }, []);

  const handleDeleteTrip = useCallback((tripId: string) => {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return;
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    deleteTrip(tripId);
    setPendingUndo({ trip });
    timeoutRef.current = setTimeout(() => { setPendingUndo(null); timeoutRef.current = null; }, TOAST_DURATION_MS);
  }, [deleteTrip, trips]);

  const handleUndo = useCallback(() => {
    if (!pendingUndo) return;
    restoreTrip(pendingUndo.trip);
    setPendingUndo(null);
    if (timeoutRef.current !== null) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, [pendingUndo, restoreTrip]);

  const tripOptgroups = useMemo(() => {
    const groups = groupTrips(tripsWithItinerary);
    return [
      { label: "Active", items: groups.active },
      { label: "Upcoming", items: groups.upcoming },
      { label: "Planning", items: groups.planning },
      { label: "Past", items: groups.past },
    ];
  }, [tripsWithItinerary]);

  const activeTripStatus = useMemo(
    () => (activeTrip ? getTripStatus(activeTrip) : null),
    [activeTrip],
  );

  const daySummary = useMemo(() => {
    if (!activeTrip?.itinerary?.days?.length) return null;
    const days = activeTrip.itinerary.days;
    const cityIds = new Set(days.map((d) => d.cityId).filter(Boolean));
    return { dayCount: days.length, cityCount: cityIds.size };
  }, [activeTrip]);

  const createdLabel = activeTrip ? formatDate(activeTrip.createdAt) : null;
  const updatedLabel = activeTrip && activeTrip.updatedAt !== activeTrip.createdAt ? formatDate(activeTrip.updatedAt) : null;
  const displayName = user.displayName || "Guest";
  const shouldShowAccountSection = showAccountSection || !isAuthenticated;

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin border-4 border-solid border-[var(--primary)] border-r-transparent" />
          <p className="text-sm text-[var(--muted-foreground)]">Pulling up your trips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--background)]">
      {/* Header */}
      <header className="pt-32 lg:pt-36 pb-8">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <motion.p
            initial={noMotion ? undefined : { opacity: 0, y: 16 }}
            animate={noMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: cEase }}
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]"
          >
            Home Base
          </motion.p>
          <motion.h1
            initial={noMotion ? undefined : { opacity: 0, y: 16 }}
            animate={noMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: cEase }}
            style={{
              fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
              fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--foreground)",
            }}
            className="mt-4 leading-[1.1]"
          >
            {displayName}
          </motion.h1>
          <motion.p
            initial={noMotion ? undefined : { opacity: 0, y: 16 }}
            animate={noMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: cEase }}
            className="mt-3 text-[15px] text-[var(--muted-foreground)]"
          >
            {content?.dashboardSubtitle ?? "Your trips, saved places, and plans in progress."}
          </motion.p>
        </div>
      </header>

      {/* Stats */}
      <section className="pb-12">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <div className="grid grid-cols-3 gap-px border border-[var(--border)] bg-[var(--border)]">
            {[
              { label: "Saved", value: saved.length, href: "/c/saved" },
              { label: "Guides", value: guideBookmarks.length, href: "/c/guides" },
              { label: "Trips", value: tripsWithItinerary.length, href: "#trips" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={noMotion ? undefined : "hidden"}
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp(i * 0.08)}
                className="flex flex-col items-center justify-center bg-[var(--background)] p-6 lg:p-8"
              >
                <p className="text-2xl font-bold tracking-[-0.04em] text-[var(--foreground)] lg:text-3xl">
                  <AnimatedCounter value={stat.value} />
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  {stat.label}
                </p>
                <Link
                  href={stat.href}
                  className="mt-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--primary)] transition-opacity hover:opacity-70"
                >
                  View
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="border-b border-[var(--border)]" />

      {/* Trips */}
      <section id="trips" className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <motion.div
            initial={noMotion ? undefined : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={fadeUp()}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Recent
            </p>
            <h2
              className="mt-4 leading-[1.1]"
              style={{
                fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
                fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "var(--foreground)",
              }}
            >
              Your Trips
            </h2>
          </motion.div>

          <div className="mt-8">
            {activeTrip ? (
              <motion.div
                initial={noMotion ? undefined : "hidden"}
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp(0.1)}
                className="border border-[var(--border)] bg-[var(--card)] p-6 lg:p-8"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                        Active Itinerary
                      </p>
                      {activeTripStatus && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                          style={{
                            backgroundColor: STATUS_CONFIG[activeTripStatus].bg,
                            color: STATUS_CONFIG[activeTripStatus].text,
                          }}
                        >
                          {STATUS_CONFIG[activeTripStatus].label}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-[var(--foreground)]">
                      {activeTrip.name}
                    </h3>
                    {createdLabel && (
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        Saved {createdLabel}
                        {updatedLabel ? ` · Updated ${updatedLabel}` : ""}
                      </p>
                    )}
                  </div>

                  {tripsWithItinerary.length > 1 && (
                    <div className="flex flex-col gap-1">
                      <label htmlFor="c-trip-selector" className="text-xs font-medium text-[var(--muted-foreground)]">
                        Switch trip
                      </label>
                      <div className="relative">
                        <select
                          id="c-trip-selector"
                          className="w-full appearance-none border border-[var(--border)] bg-[var(--background)] py-2 pl-3 pr-9 text-base font-medium text-[var(--foreground)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 sm:min-w-[200px] sm:text-sm"
                          value={selectedTripId ?? activeTrip.id}
                          onChange={(e) => setUserSelectedTripId(e.target.value)}
                        >
                          {tripOptgroups.map(({ label, items }) =>
                            items.length > 0 ? (
                              <optgroup key={label} label={label}>
                                {items.map((trip) => (
                                  <option key={trip.id} value={trip.id}>{trip.name}</option>
                                ))}
                              </optgroup>
                            ) : null,
                          )}
                        </select>
                        <svg
                          aria-hidden="true"
                          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
                          viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"
                        >
                          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {daySummary && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)]">
                      {daySummary.dayCount} day{daySummary.dayCount !== 1 ? "s" : ""}
                    </span>
                    {daySummary.cityCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)]">
                        {daySummary.cityCount} cit{daySummary.cityCount !== 1 ? "ies" : "y"}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/c/itinerary?trip=${activeTrip.id}`}
                    className="inline-flex h-11 items-center justify-center bg-[var(--primary)] px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
                  >
                    View full plan
                  </Link>
                  {activeTripStatus === "completed" && (
                    <Link
                      href={`/c/dashboard/trip-review?trip=${activeTrip.id}`}
                      className="inline-flex h-11 items-center justify-center border border-[var(--foreground)] px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--foreground)] transition-colors hover:bg-[var(--foreground)] hover:text-[var(--background)] active:scale-[0.98]"
                    >
                      View trip review
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteTrip(activeTrip.id)}
                    className="inline-flex h-11 items-center justify-center gap-1.5 border border-[var(--error)]/20 bg-[var(--error)]/5 px-5 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--error)] transition hover:bg-[var(--error)]/10 active:scale-[0.98]"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={noMotion ? undefined : "hidden"}
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp(0.1)}
                className="border border-[var(--border)] bg-[var(--card)] p-10 lg:p-16"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  Get started
                </p>
                <h3
                  className="mt-4"
                  style={{
                    fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
                    fontSize: "clamp(1.25rem, 2vw, 1.75rem)",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "var(--foreground)",
                  }}
                >
                  No trips yet
                </h3>
                <p className="mt-3 max-w-sm text-sm text-[var(--muted-foreground)]">
                  Head to the trip builder to plan your first adventure. It will appear here once it is ready.
                </p>
                <Link
                  href="/c/trip-builder"
                  className="mt-6 inline-flex h-11 items-center justify-center bg-[var(--primary)] px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
                >
                  Start planning
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      <div className="border-b border-[var(--border)]" />

      {/* Account */}
      {shouldShowAccountSection && (
        <section className="py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
            <motion.div
              initial={noMotion ? undefined : "hidden"}
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp()}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                {content?.dashboardAccountEyebrow ?? "Account"}
              </p>
              <h2
                className="mt-4 leading-[1.1]"
                style={{
                  fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
                  fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "var(--foreground)",
                }}
              >
                {content?.dashboardAccountHeading ?? "Profile & Sync"}
              </h2>
            </motion.div>

            <motion.div
              initial={noMotion ? undefined : "hidden"}
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp(0.1)}
              className="mt-8 max-w-2xl border border-[var(--border)] bg-[var(--card)] p-6 lg:p-8 space-y-6"
            >
              {supabaseUnavailable && (
                <div className="border border-[var(--warning)]/20 bg-[var(--warning)]/5 px-4 py-3 text-sm text-[var(--foreground)]">
                  Cloud sync is disabled because Supabase credentials are not configured.
                </div>
              )}

              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-base font-bold text-[var(--foreground)]">Account</h3>
                {isAuthenticated && supabase && (
                  <button
                    onClick={async () => {
                      try { await supabase.auth.signOut(); } catch { /* non-critical */ }
                      clearAllLocalData();
                    }}
                    className="h-11 border border-[var(--border)] bg-[var(--background)] px-5 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--foreground)] transition hover:bg-[var(--surface)] active:scale-[0.98]"
                  >
                    Sign out
                  </button>
                )}
              </div>

              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-sm font-bold">
                      {(displayName?.[0] ?? "G").toUpperCase()}
                    </span>
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {displayName}
                    </span>
                  </div>

                  <label className="text-sm font-medium text-[var(--foreground)] block">
                    Display name
                    <input
                      className="mt-1.5 w-full h-12 border border-[var(--border)] bg-[var(--background)] px-3 text-base text-[var(--foreground)] transition focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                      value={displayName}
                      onChange={(e) => onNameChange(e.target.value)}
                    />
                  </label>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {isLoadingProfile || isLoadingRefresh ? (
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 animate-spin border-2 border-solid border-[var(--primary)] border-r-transparent" />
                          {status || "Checking..."}
                        </span>
                      ) : status}
                    </div>
                    <button
                      onClick={clearAllLocalData}
                      disabled={isLoadingProfile || isLoadingRefresh}
                      className="h-11 border border-[var(--error)]/20 bg-[var(--error)]/5 px-5 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--error)] transition hover:bg-[var(--error)]/10 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                      Clear local data
                    </button>
                  </div>
                </>
              ) : (
                <EmailFormC supabase={supabase} supabaseUnavailable={supabaseUnavailable} />
              )}
            </motion.div>
          </div>
        </section>
      )}

      {/* Undo toast */}
      {pendingUndo && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="pointer-events-auto flex flex-col gap-3 border border-[var(--border)] bg-[var(--card)] p-4">
            <div>
              <p className="text-sm font-bold text-[var(--foreground)]">
                {content?.dashboardDeleteToastTitle ?? "Itinerary deleted"}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {pendingUndo.trip.name} was removed. Undo within 8 seconds to restore.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUndo}
              className="self-start h-9 bg-[var(--primary)] px-5 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              {content?.dashboardUndoButton ?? "Undo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
