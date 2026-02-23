"use client";

import Image from "next/image";
import { Suspense, useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { SplitText } from "@/components/ui/SplitText";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { parallaxZoomIn, durationBase } from "@/lib/motion";

export const dynamic = "force-dynamic";

type ErrorMessage = {
  title: string;
  description: string;
  action?: string;
};

const ERROR_MESSAGES: Record<string, ErrorMessage> = {
  missing_code: {
    title: "Authorization code missing",
    description:
      "The authentication request is missing the required authorization code. Please try signing in again.",
    action: "Try signing in again",
  },
  invalid_code: {
    title: "Invalid authorization code",
    description:
      "The authorization code provided is invalid or malformed. This may happen if the code has been tampered with or corrupted.",
    action: "Try signing in again",
  },
  expired_code: {
    title: "Authorization code expired",
    description:
      "The authorization code has expired. Authorization codes are only valid for a short period of time for security reasons.",
    action: "Try signing in again",
  },
  authentication_failed: {
    title: "Authentication failed",
    description:
      "We couldn't complete your sign-in. This may be due to a temporary issue with the authentication service.",
    action: "Try signing in again",
  },
  session_creation_failed: {
    title: "Session creation failed",
    description:
      "Your authorization was successful, but we couldn't create your session. Please try signing in again.",
    action: "Try signing in again",
  },
  service_unavailable: {
    title: "Service temporarily unavailable",
    description:
      "The authentication service is currently unavailable. Please try again in a few moments.",
    action: "Try again later",
  },
};

const DEFAULT_ERROR: ErrorMessage = {
  title: "Authentication error",
  description:
    "An unexpected error occurred during authentication. Please try signing in again.",
  action: "Try signing in again",
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get("message") || "unknown";
  const error = ERROR_MESSAGES[errorMessage] || DEFAULT_ERROR;

  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const imageScale = useTransform(
    scrollYProgress,
    [0, 1],
    [parallaxZoomIn.from, parallaxZoomIn.to],
  );

  return (
    <section
      ref={containerRef}
      className="relative min-h-[100dvh] overflow-hidden"
    >
      {/* Grain */}
      <div className="texture-grain pointer-events-none absolute inset-0 z-20" />

      {/* Parallax background */}
      <motion.div
        className="absolute inset-0"
        style={prefersReducedMotion ? {} : { scale: imageScale }}
      >
        <Image
          src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&q=80"
          alt="Quiet Japanese temple path"
          fill
          className="object-cover saturate-[0.7] brightness-[0.5]"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-charcoal/55" />
      </motion.div>

      {/* Giant watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center"
      >
        <span className="font-serif italic text-[clamp(6rem,18vw,12rem)] text-white/[0.06]">
          !
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-6 py-12 sm:py-20 lg:py-28 text-center">
        <div className="max-w-2xl">
          <ScrollReveal distance={10}>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/50">
              Authentication error
            </p>
          </ScrollReveal>

          <SplitText
            as="h1"
            className="mt-6 justify-center font-serif italic text-2xl tracking-heading text-white sm:text-3xl lg:text-4xl"
            splitBy="word"
            animation="clipY"
            staggerDelay={0.04}
          >
            {error.title}
          </SplitText>

          <ScrollReveal delay={0.4} distance={15}>
            <p className="mx-auto mt-8 max-w-md text-base text-white/80">
              {error.description}
            </p>
          </ScrollReveal>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: durationBase, delay: 0.7 }}
            className="mt-12 flex flex-col items-center"
          >
            <a
              href="/"
              className="relative inline-flex h-14 items-center justify-center rounded-xl bg-brand-primary px-10 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-brand-primary/90 hover:shadow-xl"
            >
              <span className="absolute inset-0 rounded-xl bg-brand-primary/20 blur-xl" />
              <span className="relative">Go Home</span>
            </a>
            {error.action && (
              <a
                href="/signin"
                className="link-reveal mt-6 text-sm font-medium uppercase tracking-wide text-white/60 transition-colors hover:text-white/90"
              >
                {error.action}
              </a>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-charcoal">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-primary border-r-transparent" />
            <p className="text-sm text-white/60">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
