"use client";

import { useEffect, useState, useMemo } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useAppState } from "@/state/AppState";
import IdentityBadge from "@/components/ui/IdentityBadge";
import { syncLocalToCloudOnce } from "@/lib/accountSync";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import type { PagesContent } from "@/types/sanitySiteContent";

const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

type AccountClientBProps = {
  content?: PagesContent;
};

export function AccountClientB({ content }: AccountClientBProps) {
  const supabase = createClient();
  const { user, setUser, clearAllLocalData, refreshFromSupabase, isLoadingRefresh } = useAppState();
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

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
        if (isActive) setIsLoadingAuth(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (isActive) setSessionUserId(session?.user?.id ?? null);
      },
    );

    return () => {
      isActive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!sessionUserId || !supabase) return;
    setIsLoadingProfile(true);
    (async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", sessionUserId).maybeSingle();
        const displayName = prof?.display_name ?? authUser?.user_metadata?.full_name ?? authUser?.email?.split("@")[0] ?? "Guest";
        setUser({ displayName });

        if (!prof) {
          await supabase.from("profiles").upsert({ id: sessionUserId, display_name: displayName });
        }

        setStatus("Syncing your trips and saves\u2026");
        const syncResult = await syncLocalToCloudOnce();
        if (syncResult?.ok === false) {
          setStatus("");
          return;
        }
        await refreshFromSupabase();
        setStatus("All synced.");
      } catch (error) {
        logger.error("Account sync failed", error instanceof Error ? error : new Error(String(error)));
        setStatus("Sync didn\u2019t go through. Refresh to try again.");
      } finally {
        setIsLoadingProfile(false);
      }
    })();
  }, [sessionUserId, supabase, setUser, refreshFromSupabase]);

  const saveProfile = useMemo(
    () =>
      debounce(async (name: string) => {
        if (!supabase) return;
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;
        await supabase.from("profiles").upsert({ id: authUser.id, display_name: name });
      }, 500),
    [supabase]
  );

  function onNameChange(v: string) {
    setUser({ displayName: v });
    saveProfile(v);
  }

  const signedIn = Boolean(sessionUserId);
  const supabaseUnavailable = !supabase;

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--primary)] border-r-transparent" />
          <p className="text-sm text-[var(--muted-foreground)]">Getting your account ready\u2026</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh]">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 lg:pt-36 pb-8 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: bEase }}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]"
        >
          {content?.accountEyebrow ?? "Settings"}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: bEase, delay: 0.1 }}
          className="mt-4 text-3xl font-bold text-[var(--foreground)] sm:text-4xl"
        >
          {content?.accountTitle ?? "Account"}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: bEase, delay: 0.2 }}
          className="mt-3 text-base text-[var(--foreground-body)]"
        >
          {content?.accountSubtitle ?? "Profile, sync, and preferences."}
        </motion.p>
      </section>

      {/* Card */}
      <section className="pb-16 sm:pb-24 lg:pb-32">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div
            className="rounded-2xl bg-white p-6 space-y-6"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            {supabaseUnavailable && (
              <div className="rounded-xl bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)]">
                Cloud sync is disabled because Supabase credentials are not configured.
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                {content?.accountProfileHeading ?? "Profile"}
              </h2>
              {signedIn && supabase && (
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="h-11 rounded-xl border border-[var(--border)] px-4 text-sm text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] transition active:scale-[0.98]"
                >
                  {content?.accountSignOutText ?? "Sign out"}
                </button>
              )}
            </div>

            {signedIn ? (
              <>
                <IdentityBadge />
                <label className="text-sm text-[var(--muted-foreground)] block">
                  {content?.accountDisplayNameLabel ?? "Display name"}
                  <input
                    className="mt-1 w-full h-12 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-base text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    value={user.displayName}
                    onChange={(e) => onNameChange(e.target.value)}
                  />
                </label>

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {isLoadingProfile || isLoadingRefresh ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-[var(--primary)] border-r-transparent" />
                        {status || "Checking\u2026"}
                      </span>
                    ) : (
                      status
                    )}
                  </div>
                  <button
                    onClick={clearAllLocalData}
                    disabled={isLoadingProfile || isLoadingRefresh}
                    className="h-11 rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/5 px-4 text-sm text-[var(--error)] hover:bg-[var(--error)]/10 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-[0.98]"
                  >
                    {content?.accountClearDataText ?? "Clear local data"}
                  </button>
                </div>
              </>
            ) : (
              <EmailFormB content={content} />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function EmailFormB({ content }: { content?: PagesContent }) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const supabaseUnavailable = !supabase;

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
    setStatus("Sending your sign-in link\u2026");
    const redirectUrl = getRedirectUrl();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl },
    });
    setStatus(error ? `Error: ${error.message}` : "Sign-in link sent \u2014 check your inbox.");
  }

  return (
    <form className="grid grid-cols-1 gap-4" onSubmit={sendMagicLink}>
      <label className="text-sm text-[var(--muted-foreground)]">
        {content?.accountEmailLabel ?? "Email for magic link"}
        <input
          type="email"
          required
          disabled={supabaseUnavailable}
          className="mt-1 w-full h-12 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          placeholder={content?.accountEmailPlaceholder ?? "name@example.com"}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <button
        type="submit"
        disabled={supabaseUnavailable}
        className="h-12 rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        {content?.accountSendLinkText ?? "Send sign-in link"}
      </button>
      {status && <p className="text-xs text-[var(--muted-foreground)]">{status}</p>}
    </form>
  );
}

function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  ms = 300,
): (...args: TArgs) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: TArgs) => {
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn(...args);
    }, ms);
  };
}
