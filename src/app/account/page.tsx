"use client";
import { useEffect, useState, useMemo } from "react";
import type { FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppState } from "@/state/AppState";
import IdentityBadge from "@/components/ui/IdentityBadge";
import { syncLocalToCloudOnce } from "@/lib/accountSync";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export default function AccountPage() {
  const supabase = useMemo(() => createClient(), []);
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
          .select("display_name, locale")
          .eq("id", sessionUserId)
          .maybeSingle();

        const displayName =
          prof?.display_name ??
          authUser?.user_metadata?.full_name ??
          authUser?.email?.split("@")[0] ??
          "Guest";

        const locale = (prof?.locale as "en" | "jp") ?? "en";

        setUser({ displayName, locale });

        if (!prof) {
          await supabase.from("profiles").upsert({
            id: sessionUserId,
            display_name: displayName,
            locale,
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
      debounce(async (name: string, loc: "en" | "jp") => {
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
          locale: loc,
        });
      }, 500),
    [supabase]
  );

  function onNameChange(v: string) {
    setUser({ displayName: v });
    saveProfile(v, user.locale);
  }

  function onLocaleChange(v: "en" | "jp") {
    setUser({ locale: v });
    saveProfile(user.displayName, v);
  }

  const signedIn = Boolean(sessionUserId);
  const supabaseUnavailable = !supabase;

  if (isLoadingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-sm text-gray-600">Loading account...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <section className="max-w-3xl mx-auto px-8 pt-8">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-md p-6 space-y-6">
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
            <h1 className="text-xl font-semibold text-gray-900">Account</h1>
            {signedIn && supabase && (
              <button
                onClick={() => supabase.auth.signOut()}
                className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-700 hover:bg-gray-50"
              >
                Sign out
              </button>
            )}
          </div>

          {signedIn ? (
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

              <label className="text-sm text-gray-700 block">
                Language
                <select
                  className="mt-1 w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={user.locale}
                  onChange={(e) => onLocaleChange(e.target.value as "en" | "jp")}
                >
                  <option value="en">English</option>
                  <option value="jp">日本語 (Japanese)</option>
                </select>
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
            <EmailForm />
          )}
        </div>
      </section>
    </main>
  );
}

function EmailForm() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const supabaseUnavailable = !supabase;

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault();
     if (!supabase) {
       setStatus("Supabase is not configured. Unable to send sign-in links.");
       return;
     }
    setStatus("Sending magic link…");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
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