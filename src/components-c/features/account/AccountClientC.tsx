"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import type { FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { useAppState } from "@/state/AppState";
import IdentityBadge from "@/components/ui/IdentityBadge";
import { syncLocalToCloudOnce } from "@/lib/accountSync";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { debounce } from "@/lib/utils";
import { fadeUp } from "@c/ui/motionC";
import type { PagesContent } from "@/types/sanitySiteContent";

type AccountClientCProps = {
  content?: PagesContent;
};

export function AccountClientC({ content }: AccountClientCProps) {
  const supabase = createClient();
  const { user, setUser, clearAllLocalData, refreshFromSupabase, isLoadingRefresh } = useAppState();
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const prefersReduced = useReducedMotion();

  const motionProps = (delay = 0) =>
    prefersReduced
      ? {}
      : {
          initial: "hidden",
          whileInView: "visible",
          viewport: { once: true },
          variants: fadeUp(delay),
        };

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

        setStatus("Syncing your trips and saves...");
        const syncResult = await syncLocalToCloudOnce();
        if (syncResult?.ok === false) {
          setStatus("");
          return;
        }
        await refreshFromSupabase();
        setStatus("All synced.");
      } catch (error) {
        logger.error("Account sync failed", error instanceof Error ? error : new Error(String(error)));
        setStatus("Sync didn't go through. Refresh to try again.");
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
          <div className="mb-4 inline-block h-8 w-8 animate-spin border-4 border-solid border-[var(--primary)] border-r-transparent" />
          <p className="text-sm text-[var(--muted-foreground)]">Getting your account ready...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh]">
      {/* Header section */}
      <section className="mx-auto max-w-[1400px] px-6 lg:px-10 pt-32 lg:pt-40 pb-12">
        <motion.p
          {...motionProps(0)}
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]"
        >
          {content?.accountEyebrow ?? "Settings"}
        </motion.p>
        <motion.h1
          {...motionProps(0.1)}
          className="mt-4 text-[var(--foreground)]"
          style={{
            fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
            fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
        >
          {content?.accountTitle ?? "Account"}
        </motion.h1>
        <motion.p
          {...motionProps(0.2)}
          className="mt-3 text-base text-[var(--foreground-body)]"
        >
          {content?.accountSubtitle ?? "Profile, sync, and preferences."}
        </motion.p>
      </section>

      {/* Content */}
      <section className="pb-24 sm:pb-32 lg:pb-48">
        <div className="mx-auto max-w-3xl px-6 lg:px-10">
          <motion.div
            {...motionProps(0.25)}
            className="border border-[var(--border)] bg-[var(--background)] p-6 sm:p-8 space-y-6"
          >
            {supabaseUnavailable && (
              <div className="border border-[var(--border)] px-4 py-3 text-sm text-[var(--foreground)]">
                Cloud sync is disabled because Supabase credentials are not configured.
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2
                className="text-xl text-[var(--foreground)]"
                style={{
                  fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                }}
              >
                {content?.accountProfileHeading ?? "Profile"}
              </h2>
              {signedIn && supabase && (
                <button
                  onClick={async () => {
                    try {
                      await supabase.auth.signOut();
                    } catch {
                      // Sign-out failure is non-critical
                    }
                    clearAllLocalData();
                  }}
                  className="h-11 border border-[var(--border)] px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] transition active:scale-[0.98]"
                >
                  {content?.accountSignOutText ?? "Sign out"}
                </button>
              )}
            </div>

            <div className="border-t border-[var(--border)]" />

            {signedIn ? (
              <>
                <IdentityBadge />

                <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)] block">
                  {content?.accountDisplayNameLabel ?? "Display name"}
                  <input
                    className="mt-2 w-full h-12 border border-[var(--border)] bg-[var(--background)] px-4 text-base text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    value={user.displayName}
                    onChange={(e) => onNameChange(e.target.value)}
                  />
                </label>

                <div className="border-t border-[var(--border)]" />

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {isLoadingProfile || isLoadingRefresh ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 animate-spin border-2 border-solid border-[var(--primary)] border-r-transparent" />
                        {status || "Checking..."}
                      </span>
                    ) : (
                      status
                    )}
                  </div>
                  <ClearDataButtonC
                    onConfirm={clearAllLocalData}
                    disabled={isLoadingProfile || isLoadingRefresh}
                    label={content?.accountClearDataText ?? "Clear local data"}
                  />
                </div>
              </>
            ) : (
              <EmailFormC content={content} />
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function ClearDataButtonC({ onConfirm, disabled, label }: { onConfirm: () => void; disabled: boolean; label: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    onConfirm();
  }, [onConfirm]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="h-11 border border-[var(--error)]/30 bg-[var(--error)]/5 px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--error)] hover:bg-[var(--error)]/10 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-[0.98]"
      >
        {label}
      </button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Clear all local data?">
        <p className="text-sm text-[var(--muted-foreground)]">
          This removes all saved trips, favorites, and preferences from this device. Anything synced to your account stays safe in the cloud.
        </p>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={() => setIsOpen(false)}
            className="h-11 border border-[var(--border)] px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="h-11 bg-[var(--error)] px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-colors hover:opacity-90 active:scale-[0.98]"
          >
            Clear data
          </button>
        </div>
      </Modal>
    </>
  );
}

function EmailFormC({ content }: { content?: PagesContent }) {
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
    setStatus("Sending your sign-in link...");
    const redirectUrl = getRedirectUrl();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl },
    });
    setStatus(error ? `Error: ${error.message}` : "Sign-in link sent. Check your inbox.");
  }

  return (
    <form className="grid grid-cols-1 gap-5" onSubmit={sendMagicLink}>
      <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
        {content?.accountEmailLabel ?? "Email for magic link"}
        <input
          type="email"
          required
          disabled={supabaseUnavailable}
          className="mt-2 w-full h-12 border border-[var(--border)] bg-[var(--background)] px-4 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          placeholder={content?.accountEmailPlaceholder ?? "name@example.com"}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <button
        type="submit"
        disabled={supabaseUnavailable}
        className="h-11 bg-[var(--primary)] px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        {content?.accountSendLinkText ?? "Send sign-in link"}
      </button>
      {status && <p className="text-xs text-[var(--muted-foreground)]">{status}</p>}
    </form>
  );
}
