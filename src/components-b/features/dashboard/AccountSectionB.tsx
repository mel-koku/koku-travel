"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { env } from "@/lib/env";

const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

type AccountSectionBProps = {
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

export function AccountSectionB({
  isAuthenticated,
  supabase,
  supabaseUnavailable,
  displayName,
  isLoadingProfile,
  isLoadingRefresh,
  status,
  onNameChange,
  onClearLocalData,
}: AccountSectionBProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease: bEase }}
      className="rounded-2xl bg-[var(--card)] p-6 space-y-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {supabaseUnavailable && (
        <div className="rounded-xl border border-[var(--warning)]/20 bg-[var(--warning)]/5 px-4 py-3 text-sm text-[var(--foreground)]">
          Cloud sync is disabled because Supabase credentials are not configured. Set{" "}
          <code className="mx-1 rounded bg-[var(--surface)] px-1.5 py-0.5 text-xs">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          and{" "}
          <code className="mx-1 rounded bg-[var(--surface)] px-1.5 py-0.5 text-xs">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          to enable account features.
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Account</h2>
        {isAuthenticated && supabase && (
          <button
            onClick={() => supabase.auth.signOut()}
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm font-medium text-[var(--foreground-body)] transition hover:bg-[var(--surface)]"
          >
            Sign out
          </button>
        )}
      </div>

      {isAuthenticated ? (
        <>
          {/* Avatar + identity */}
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-sm font-bold">
              {(displayName?.[0] ?? "G").toUpperCase()}
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                {displayName || "Guest"}
              </span>
            </div>
          </div>

          {/* Display name input */}
          <label className="text-sm font-medium text-[var(--foreground-body)] block">
            Display name
            <input
              className="mt-1.5 w-full h-12 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-base text-[var(--foreground)] transition focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
              value={displayName}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </label>

          {/* Status + clear data */}
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
              onClick={onClearLocalData}
              disabled={isLoadingProfile || isLoadingRefresh}
              className="h-10 rounded-xl border border-[var(--error)]/20 bg-[var(--error)]/5 px-4 text-sm font-medium text-[var(--error)] transition hover:bg-[var(--error)]/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear local data
            </button>
          </div>
        </>
      ) : (
        <EmailFormB supabase={supabase} supabaseUnavailable={supabaseUnavailable} />
      )}
    </motion.div>
  );
}

type EmailFormBProps = {
  supabase: SupabaseClient | null;
  supabaseUnavailable: boolean;
};

function EmailFormB({ supabase, supabaseUnavailable }: EmailFormBProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  function getRedirectUrl(): string {
    const siteUrl = env.siteUrl;
    if (siteUrl) {
      return `${siteUrl}/auth/callback`;
    }
    if (typeof window !== "undefined") {
      return `${window.location.origin}/auth/callback`;
    }
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
      <label className="text-sm font-medium text-[var(--foreground-body)]">
        Email for magic link
        <input
          type="email"
          required
          disabled={supabaseUnavailable}
          className="mt-1.5 w-full h-12 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-base text-[var(--foreground)] transition focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <button
        type="submit"
        disabled={supabaseUnavailable}
        className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send sign-in link
      </button>
      {status && (
        <p className="text-xs text-[var(--muted-foreground)]">{status}</p>
      )}
    </form>
  );
}
