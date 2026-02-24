"use client";

import Image from "next/image";
import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import type { PagesContent } from "@/types/sanitySiteContent";

const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

type SignInClientBProps = {
  content?: PagesContent;
};

function getRedirectUrl(): string {
  const siteUrl = env.siteUrl;
  if (siteUrl) return `${siteUrl}/auth/callback`;
  if (typeof window !== "undefined") return `${window.location.origin}/auth/callback`;
  return "/auth/callback";
}

export function SignInClientB({ content }: SignInClientBProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const supabase = createClient();

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
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      {/* Left panel — image */}
      <div className="relative w-full overflow-hidden lg:w-1/2 min-h-[40vh] lg:min-h-[100dvh]">
        <Image
          src={content?.signInBackgroundImage?.url ?? "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=1920&q=80"}
          alt="Japanese scene"
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
        />
        <div className="absolute inset-0 bg-black/40" />

        <div className="relative z-10 flex h-full min-h-[40vh] lg:min-h-[100dvh] items-end p-8 sm:p-12 lg:p-16">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: bEase }}
              className="text-[clamp(2rem,6vw,4rem)] font-bold leading-[1.1] text-white"
            >
              {content?.signInHeading ?? "Welcome back"}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: bEase, delay: 0.2 }}
              className="mt-4 max-w-sm text-base text-white/70"
            >
              {content?.signInDescription ?? "Sign in to pick up where you left off."}
            </motion.p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full items-center justify-center bg-[var(--background)] px-6 py-12 sm:py-20 lg:w-1/2 lg:py-0">
        <div className="w-full max-w-sm">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: bEase, delay: 0.1 }}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]"
          >
            Account
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: bEase, delay: 0.2 }}
            className="mt-4 text-2xl font-bold text-[var(--foreground)] sm:text-3xl"
          >
            {content?.signInFormHeading ?? "Sign in with email"}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: bEase, delay: 0.3 }}
            className="mt-3 text-sm text-[var(--foreground-body)]"
          >
            {content?.signInFormDescription ?? "We'll send a magic link to your inbox."}
          </motion.p>

          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: bEase, delay: 0.4 }}
            className="mt-8 space-y-4"
            onSubmit={sendMagicLink}
          >
            <label className="block text-sm text-[var(--muted-foreground)]">
              Email address
              <input
                type="email"
                required
                disabled={!supabase}
                className="mt-1.5 block w-full h-12 rounded-xl border border-[var(--border)] bg-white px-4 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <button
              type="submit"
              disabled={!supabase}
              className="w-full h-12 rounded-xl bg-[var(--primary)] text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {content?.signInSubmitText ?? "Send Sign-in Link"}
            </button>

            {status && <p className="text-xs text-[var(--muted-foreground)]">{status}</p>}
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: bEase, delay: 0.6 }}
            className="mt-8 space-y-3 border-t border-[var(--border)] pt-6"
          >
            <p className="text-xs text-[var(--muted-foreground)]">
              {content?.signInNoAccountText ?? "No account? One is created automatically."}
            </p>
            <a
              href="/b/places"
              className="text-sm font-medium text-[var(--primary)] hover:underline"
            >
              {content?.signInGuestText ?? "Continue as guest"}
            </a>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
