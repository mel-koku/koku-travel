"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type FinalCtaBProps = {
  content?: LandingPageContent;
};

export function FinalCtaB({ content }: FinalCtaBProps) {
  return (
    <section className="bg-white py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl bg-[var(--primary)] px-8 py-16 text-center sm:px-16"
          style={{ boxShadow: "var(--shadow-depth)" }}
        >
          <h2 className="text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
            {content?.finalCtaHeading ?? "Ready to see Japan differently?"}
          </h2>
          <p className="mt-4 text-white/80">
            {content?.finalCtaDescription ??
              "Build a trip tailored to how you actually want to travel."}
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/b/trip-builder"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-semibold text-[var(--primary)] shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-elevated)] active:scale-[0.98]"
            >
              {content?.finalCtaPrimaryText ?? "Build My Trip"}
            </Link>
            <Link
              href="/b/places"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-white/30 px-8 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              {content?.finalCtaSecondaryText ?? "Explore Places"}
            </Link>
          </div>
          {content?.finalCtaSubtext && (
            <p className="mt-4 text-xs text-white/60">
              {content.finalCtaSubtext}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
