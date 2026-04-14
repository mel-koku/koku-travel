"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import IdentityBadge from "@/components/ui/IdentityBadge";
import { env } from "@/lib/env";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/cn";
import { TravelPreferencesSection } from "@/components/features/account/TravelPreferencesSection";
import { GoogleSignInButton } from "@/components/ui/GoogleSignInButton";

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
    <div className="rounded-lg border border-border bg-surface p-6 space-y-6">
      {supabaseUnavailable && (
        <div className="rounded-lg border border-brand-secondary/20 bg-brand-secondary/5 px-4 py-3 text-sm text-foreground">
          Cloud sync is unavailable. Your data is saved locally on this device.
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className={cn(typography({ intent: "editorial-h3" }), "text-lg md:text-lg")}>Account</h2>
        {isAuthenticated && supabase && (
          <button
            onClick={async () => {
              try {
                await supabase.auth.signOut();
              } catch {
                // Sign-out failure is non-critical — session will expire naturally
              }
              onClearLocalData();
            }}
            className="h-10 rounded-lg border border-border bg-background px-4 text-sm text-foreground-secondary hover:bg-surface"
          >
            Sign out
          </button>
        )}
      </div>

      {isAuthenticated ? (
        <>
          <IdentityBadge />
          <label className="text-sm text-foreground-secondary block">
            Display name
            <input
              className="mt-1 w-full h-12 rounded-lg border border-border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-primary"
              value={displayName}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </label>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs text-stone">
              {isLoadingProfile || isLoadingRefresh ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-brand-primary border-r-transparent"></span>
                  {status || "Checking\u2026"}
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

          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground-secondary">
              Travel Preferences
            </h3>
            <p className="mt-1 text-xs text-stone">
              Defaults for your trip builder. Changes save automatically.
            </p>
            <div className="mt-4">
              <TravelPreferencesSection />
            </div>
          </div>
        </>
      ) : (
        <>
          <EmailForm supabase={supabase} supabaseUnavailable={supabaseUnavailable} />
          <div className="border-t border-border pt-6 opacity-60">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground-secondary">
              Travel Preferences
            </h3>
            <p className="mt-1 text-xs text-stone">
              Sign in to save your travel preferences.
            </p>
            <div className="mt-4">
              <TravelPreferencesSection disabled />
            </div>
          </div>
        </>
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
      setStatus("Sign-in is temporarily unavailable.");
      return;
    }
    setStatus("Sending your sign-in link\u2026");
    const redirectUrl = getRedirectUrl();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl },
    });
    setStatus(error ? `Error: ${error.message}` : "Sign-in link sent. Check your inbox.");
  }

  return (
    <div className="space-y-4">
      <GoogleSignInButton />
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-surface px-4 text-stone">or</span>
        </div>
      </div>
      <form className="grid grid-cols-1 gap-4" onSubmit={sendMagicLink}>
        <label className="text-sm text-foreground-secondary">
          Email for magic link
          <input
            type="email"
            required
            disabled={supabaseUnavailable}
            className="mt-1 w-full h-12 rounded-lg border border-border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-primary"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={supabaseUnavailable}
          className="h-11 rounded-lg bg-brand-primary px-4 text-sm font-medium text-white hover:bg-brand-primary/90 active:scale-[0.98] transition-transform"
        >
          Send sign-in link
        </button>
        <div className="text-xs text-stone">{status}</div>
      </form>
    </div>
  );
}
