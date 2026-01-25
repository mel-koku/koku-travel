"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import IdentityBadge from "@/components/ui/IdentityBadge";
import { env } from "@/lib/env";

type AccountSectionProps = {
  isAuthenticated: boolean;
  supabase: SupabaseClient | null;
  supabaseUnavailable: boolean;
  displayName: string;
  isLoadingProfile: boolean;
  isLoadingRefresh: boolean;
  status: string;
  onNameChange: (name: string) => void;
  onClearLocalData: () => void;
};

export function AccountSection({
  isAuthenticated,
  supabase,
  supabaseUnavailable,
  displayName,
  isLoadingProfile,
  isLoadingRefresh,
  status,
  onNameChange,
  onClearLocalData,
}: AccountSectionProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-6">
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
        <h2 className="text-lg font-semibold text-charcoal">Account</h2>
        {isAuthenticated && supabase && (
          <button
            onClick={() => supabase.auth.signOut()}
            className="h-10 rounded-lg border border-border bg-background px-4 text-sm text-warm-gray hover:bg-sand"
          >
            Sign out
          </button>
        )}
      </div>

      {isAuthenticated ? (
        <>
          <IdentityBadge />
          <label className="text-sm text-warm-gray block">
            Display name
            <input
              className="mt-1 w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              value={displayName}
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
              onClick={onClearLocalData}
              disabled={isLoadingProfile || isLoadingRefresh}
              className="h-10 rounded-lg border border-error/30 bg-error/10 px-4 text-sm text-error hover:bg-error/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear local data
            </button>
          </div>
        </>
      ) : (
        <EmailForm supabase={supabase} supabaseUnavailable={supabaseUnavailable} />
      )}
    </div>
  );
}

type EmailFormProps = {
  supabase: SupabaseClient | null;
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
    setStatus("Sending magic link...");
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
