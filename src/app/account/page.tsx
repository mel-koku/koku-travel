"use client";
import { useEffect, useState, useMemo } from "react";  // useMemo kept for saveProfile debouncing
import type { FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppState } from "@/state/AppState";
import IdentityBadge from "@/components/ui/IdentityBadge";
import { syncLocalToCloudOnce } from "@/lib/accountSync";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

export default function AccountPage() {
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
      } catch (error) {
        logger.error("Account sync failed", error instanceof Error ? error : new Error(String(error)));
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

  const signedIn = Boolean(sessionUserId);
  const supabaseUnavailable = !supabase;

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-primary border-r-transparent"></div>
          <p className="text-sm text-foreground-secondary">Loading account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-24">
      <section className="max-w-3xl mx-auto px-8 pt-8">
        <div className="rounded-2xl border border-border bg-background shadow-md p-6 space-y-6">
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
            <h1 className="text-xl font-semibold text-charcoal">Account</h1>
            {signedIn && supabase && (
              <button
                onClick={() => supabase.auth.signOut()}
                className="h-10 rounded-lg border border-border bg-background px-4 text-sm text-warm-gray hover:bg-sand"
              >
                Sign out
              </button>
            )}
          </div>

          {signedIn ? (
            <>
              <IdentityBadge />
              <label className="text-sm text-warm-gray block">
                Display name
                <input
                  className="mt-1 w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  value={user.displayName}
                  onChange={(e) => onNameChange(e.target.value)}
                />
              </label>

              <div className="flex items-center justify-between">
                <div className="text-xs text-stone">
                  {isLoadingProfile || isLoadingRefresh ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-brand-primary border-r-transparent"></span>
                      {status || "Loading..."}
                    </span>
                  ) : (
                    status
                  )}
                </div>
                <button
                  onClick={clearAllLocalData}
                  disabled={isLoadingProfile || isLoadingRefresh}
                  className="h-10 rounded-lg border border-error/30 bg-error/10 px-4 text-sm text-error hover:bg-error/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear local data
                </button>
              </div>
            </>
          ) : (
            <EmailForm />
          )}
        </div>
      </section>
    </div>
  );
}

function EmailForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const supabaseUnavailable = !supabase;

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
    <label className="text-sm text-warm-gray">
      Email for magic link
      <input
        type="email"
        required
        disabled={supabaseUnavailable}
        className="mt-1 w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        placeholder="name@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
    </label>
    <button
      type="submit"
      disabled={supabaseUnavailable}
      className="h-10 rounded-lg bg-brand-primary px-4 text-sm font-medium text-white hover:bg-brand-primary/90"
    >
      Send sign-in link
    </button>
    <div className="text-xs text-stone">{status}</div>
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