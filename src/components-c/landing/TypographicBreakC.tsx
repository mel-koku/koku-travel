"use client";

import { motion, useReducedMotion } from "framer-motion";

const cEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

export function TypographicBreakC() {
  const noMotion = !!useReducedMotion();

  return (
    <section
      aria-label="Statement"
      className="bg-[var(--surface)]"
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="flex min-h-[60vh] items-center justify-center py-24 sm:py-32 lg:min-h-[70vh] lg:py-48">
          <motion.p
            initial={noMotion ? undefined : { opacity: 0, scale: 0.95 }}
            whileInView={noMotion ? undefined : { opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: cEase }}
            className="max-w-4xl text-center leading-[1.1] text-[var(--foreground)]"
            style={{
              fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
              fontSize: "clamp(2rem, 5vw, 4.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
            }}
          >
            Every trip starts somewhere you didn&apos;t expect.
          </motion.p>
        </div>
      </div>
      <div className="border-b border-[var(--border)]" />
    </section>
  );
}
