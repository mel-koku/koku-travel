"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppState } from "@/state/AppState";
import IdentityBadge from "@/components/ui/IdentityBadge";
import { syncLocalToCloudOnce } from "@/lib/accountSync";

export default function AccountPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user, setUser, clearAllLocalData, refreshFromSupabase } = useAppState();
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  // watch auth state
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setSessionUserId(user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSessionUserId(sess?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // load profile from Supabase when signed in
  useEffect(() => {
    if (!sessionUserId) return;
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
        console.error("Account sync failed:", error);
        setStatus("Sync failed. Please try again.");
      }
    })();
  }, [sessionUserId, supabase, setUser, refreshFromSupabase]);

  // save profile edits (debounced)
  const saveProfile = useMemo(
    () =>
      debounce(async (name: string, loc: "en" | "jp") => {
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

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <section className="max-w-3xl mx-auto px-8 pt-8">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-md p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Account</h1>
            {signedIn && (
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
                <div className="text-xs text-gray-500">{status}</div>
                <button
                  onClick={clearAllLocalData}
                  className="h-10 rounded-lg border border-red-200 bg-red-50 px-4 text-sm text-red-700 hover:bg-red-100"
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

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
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
        className="mt-1 w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="name@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
    </label>
    <button
      type="submit"
      className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
    >
      Send sign-in link
    </button>
    <div className="text-xs text-gray-500">{status}</div>
  </form>
  );
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms = 300) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}