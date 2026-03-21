"use client";

import Image from "next/image";
import { useState } from "react";
import type { FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { fadeUp } from "@c/ui/motionC";
import type { PagesContent } from "@/types/sanitySiteContent";

type SignInClientCProps = {
  content?: PagesContent;
};

function getRedirectUrl(): string {
  const siteUrl = env.siteUrl;
  const base = siteUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
  const callbackUrl = `${base}/auth/callback`;

  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      return `${callbackUrl}?next=${encodeURIComponent(next)}`;
    }
  }
  return callbackUrl;
}

export function SignInClientC({ content }: SignInClientCProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const supabase = createClient();
  const prefersReduced = useReducedMotion();

  const motionProps = (delay = 0) =>
    prefersReduced
      ? {}
      : {
          initial: "hidden",
          animate: "visible",
          variants: fadeUp(delay),
        };

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setStatus({ message: "Sign-in is temporarily unavailable.", isError: true });
      return;
    }
    setStatus({ message: "Sending your sign-in link...", isError: false });
    const redirectUrl = getRedirectUrl();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl },
    });
    setStatus(
      error
        ? { message: `Error: ${error.message}`, isError: true }
        : { message: "Sign-in link sent. Check your inbox.", isError: false },
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      {/* Left panel -- image */}
      <div className="relative w-full overflow-hidden lg:w-1/2 min-h-[40vh] lg:min-h-[100dvh]">
        <Image
          src={content?.signInBackgroundImage?.url ?? "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=1920&q=80"}
          alt="Japanese scene"
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
        />
        <div className="absolute inset-0 bg-charcoal/50" />

        <div className="relative z-10 flex h-full min-h-[40vh] lg:min-h-[100dvh] items-end p-8 sm:p-12 lg:p-16">
          <div>
            <motion.p
              {...motionProps(0)}
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60"
            >
              Koku Travel
            </motion.p>
            <motion.h1
              {...motionProps(0.1)}
              className="mt-4 leading-[1.05] text-white"
              style={{
                fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
              }}
            >
              {content?.signInHeading ?? "Welcome back"}
            </motion.h1>
            <motion.p
              {...motionProps(0.2)}
              className="mt-4 max-w-sm text-base text-white/70"
            >
              {content?.signInDescription ?? "Sign in to pick up where you left off."}
            </motion.p>
          </div>
        </div>
      </div>

      {/* Right panel -- form */}
      <div className="flex w-full items-center justify-center bg-[var(--background)] px-6 py-16 sm:py-24 lg:w-1/2 lg:py-0">
        <div className="w-full max-w-md">
          <motion.p
            {...motionProps(0.1)}
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]"
          >
            Account
          </motion.p>

          <motion.h2
            {...motionProps(0.15)}
            className="mt-4 text-[var(--foreground)]"
            style={{
              fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
              fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            {content?.signInFormHeading ?? "Sign in with email"}
          </motion.h2>

          <motion.p
            {...motionProps(0.2)}
            className="mt-3 text-sm text-[var(--foreground-body)]"
          >
            {content?.signInFormDescription ?? "We'll send a magic link to your inbox."}
          </motion.p>

          <motion.form
            {...motionProps(0.3)}
            className="mt-10 space-y-5"
            onSubmit={sendMagicLink}
          >
            <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              Email address
              <input
                type="email"
                required
                disabled={!supabase}
                className="mt-2 block w-full h-12 border border-[var(--border)] bg-[var(--background)] px-4 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <button
              type="submit"
              disabled={!supabase}
              className="w-full h-11 bg-[var(--primary)] px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {content?.signInSubmitText ?? "Send Sign-in Link"}
            </button>

            {status && (
              <p className={`text-xs ${status.isError ? "text-[var(--error)]" : "text-[var(--success)]"}`}>
                {status.message}
              </p>
            )}
          </motion.form>

          <motion.div
            {...motionProps(0.4)}
            className="mt-10 space-y-3 border-t border-[var(--border)] pt-6"
          >
            <p className="text-xs text-[var(--muted-foreground)]">
              {content?.signInNoAccountText ?? "No account? One is created automatically."}
            </p>
            <a
              href="/c/places"
              className="inline-block text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--primary)] hover:underline"
            >
              {content?.signInGuestText ?? "Continue as guest"}
            </a>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
