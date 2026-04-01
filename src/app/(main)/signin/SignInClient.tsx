"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { parallaxSection, durationBase } from "@/lib/motion";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import type { PagesContent } from "@/types/sanitySiteContent";

type SignInClientProps = {
  content?: PagesContent;
};

function getRedirectUrl(): string {
  const siteUrl = env.siteUrl;
  const base = siteUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
  const callbackUrl = `${base}/auth/callback`;

  // Preserve current page as post-sign-in redirect target
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      return `${callbackUrl}?next=${encodeURIComponent(next)}`;
    }
  }
  return callbackUrl;
}

export function SignInClient({ content }: SignInClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const supabase = createClient();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const imageScale = useTransform(
    scrollYProgress,
    [0, 1],
    [parallaxSection.from, parallaxSection.to],
  );

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setStatus({ message: "Sign-in is temporarily unavailable.", isError: true });
      return;
    }
    setStatus({ message: "Sending your sign-in link\u2026", isError: false });
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
    <div
      ref={containerRef}
      className="flex min-h-[100dvh] flex-col lg:flex-row"
    >
      {/* Left panel — atmospheric image */}
      <div className="relative w-full overflow-hidden lg:w-1/2 min-h-[40vh] lg:min-h-[100dvh]">
        <motion.div
          className="absolute inset-0"
          style={prefersReducedMotion ? {} : { scale: imageScale }}
        >
          <Image
            src={content?.signInBackgroundImage?.url ?? "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=1920&q=80"}
            alt="Warm Japanese interior"
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
          />
          <div className="absolute inset-0 bg-charcoal/60" />
        </motion.div>
        <div className="texture-grain pointer-events-none absolute inset-0" />

        {/* Text over image */}
        <div className="relative z-10 flex h-full min-h-[40vh] lg:min-h-[100dvh] items-end p-8 sm:p-12 lg:p-16">
          <div>
            <ScrollReveal>
              <h1 className={cn(typography({ intent: "editorial-h1" }), "text-[clamp(2rem,6vw,4rem)] text-white")}>
                {content?.signInHeading ?? "Sign in"}
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.3} distance={15}>
              <p className="mt-4 max-w-sm text-base text-white/70">
                {content?.signInDescription ?? "Your trips, saves, and plans. All in one place."}
              </p>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* Right panel — sign-in form */}
      <div className="flex w-full items-center justify-center bg-background px-6 py-12 sm:py-20 lg:w-1/2 lg:py-0">
        <div className="w-full max-w-sm">
          <ScrollReveal distance={10}>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-brand-primary">
              Account
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <h2 className={cn(typography({ intent: "editorial-h2" }), "mt-4")}>
              {content?.signInFormHeading ?? "Sign in with email"}
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={0.3} distance={10}>
            <p className="mt-3 text-sm text-foreground-secondary">
              {content?.signInFormDescription ?? "We'll send a magic link to your inbox."}
            </p>
          </ScrollReveal>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: durationBase, delay: 0.5 }}
            className="mt-8 space-y-4"
            onSubmit={sendMagicLink}
          >
            <label className="block text-sm text-foreground-secondary">
              Email address
              <input
                type="email"
                required
                disabled={!supabase}
                className="mt-1.5 block w-full h-12 rounded-lg border border-border bg-surface px-4 text-base text-foreground placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <button
              type="submit"
              disabled={!supabase}
              className="relative w-full h-12 rounded-lg bg-brand-primary text-sm font-semibold uppercase tracking-wider text-white shadow-[var(--shadow-elevated)] transition-all hover:bg-brand-primary/90 hover:shadow-[var(--shadow-elevated)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="absolute inset-0 rounded-lg bg-brand-primary/20 blur-xl" />
              <span className="relative">{content?.signInSubmitText ?? "Send Sign-in Link"}</span>
            </button>

            {status && (
              <p className={`flex items-center gap-1.5 text-xs ${status.isError ? "text-error" : "text-success"}`} role="alert">
                {status.isError ? (
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
                ) : (
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                )}
                {status.message}
              </p>
            )}
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: durationBase, delay: 0.8 }}
            className="mt-8 space-y-3 border-t border-border pt-6"
          >
            <p className="text-xs text-stone">
              {content?.signInNoAccountText ?? "No account? One is created automatically."}
            </p>
            <a
              href="/places"
              className="link-reveal text-sm font-medium uppercase tracking-wide text-foreground-secondary transition-colors hover:text-foreground"
            >
              {content?.signInGuestText ?? "Continue as guest"}
            </a>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
