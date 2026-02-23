"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import type { LandingPageContent } from "@/types/sanitySiteContent";

const defaultStats = [
  { value: "4,200", suffix: "+", label: "Curated places" },
  { value: "47", suffix: "", label: "Prefectures covered" },
  { value: "100", suffix: "%", label: "Locally researched" },
];

/** Animate a number from 0 to target over ~1.2s when visible. */
function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [inView, value]);

  return <span ref={ref}>{display.toLocaleString()}</span>;
}

/** Parse a stat value string like "3,950" or "47" to a number. */
function parseStatValue(raw: string): number {
  return parseInt(raw.replace(/,/g, ""), 10) || 0;
}

type StatsBProps = {
  locationCount: number;
  content?: LandingPageContent;
};

export function StatsB({ locationCount, content }: StatsBProps) {
  const stats = content?.philosophyStats ?? defaultStats;
  const heading =
    content?.philosophyHeading ??
    "Not from a desk, but from years of living here.";

  return (
    <section className="bg-[var(--background)] py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="mx-auto max-w-2xl text-center text-2xl font-semibold leading-snug tracking-[-0.02em] text-[var(--foreground)] sm:text-3xl"
        >
          {heading}
        </motion.p>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
          {stats.map((stat, i) => {
            const numericValue = stat.value.includes("{locationCount}")
              ? locationCount
              : parseStatValue(stat.value);

            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.6,
                  delay: 0.2 + i * 0.12,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                whileHover={{
                  y: -3,
                  transition: { type: "spring", stiffness: 300, damping: 25 },
                }}
                className="rounded-2xl bg-white p-8 text-center transition-shadow duration-300 hover:shadow-[var(--shadow-elevated)]"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <p className="text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">
                  <AnimatedNumber value={numericValue} />
                  <span className="text-[var(--primary)]">
                    {stat.suffix ?? defaultStats[i]?.suffix}
                  </span>
                </p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
