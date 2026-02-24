"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";

const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

/** Animate a number from 0 to target over ~1.2s when visible. */
function AnimatedCounter({ value }: { value: number }) {
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

type StatsSectionBProps = {
  savedCount: number;
  guideBookmarksCount: number;
  tripsCount: number;
};

const stats = [
  { key: "saved", label: "Saved", linkLabel: "View saved", href: "/b/places" },
  { key: "guides", label: "Guides", linkLabel: "View guides", href: "/b/guides" },
  { key: "trips", label: "Trips", linkLabel: "View trips", href: "#trips" },
] as const;

export function StatsSectionB({
  savedCount,
  guideBookmarksCount,
  tripsCount,
}: StatsSectionBProps) {
  const values: Record<string, number> = {
    saved: savedCount,
    guides: guideBookmarksCount,
    trips: tripsCount,
  };

  return (
    <section className="py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.6,
                delay: 0.1 + i * 0.1,
                ease: bEase,
              }}
              whileHover={{
                y: -3,
                transition: { type: "spring", stiffness: 300, damping: 25 },
              }}
              className="rounded-2xl bg-[var(--card)] p-6 text-center transition-shadow duration-300 hover:shadow-[var(--shadow-elevated)]"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <p className="text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">
                <AnimatedCounter value={values[stat.key] ?? 0} />
              </p>
              <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
                {stat.label}
              </p>
              <Link
                href={stat.href}
                className="mt-3 inline-block text-xs font-medium text-[var(--primary)] transition-colors hover:text-[var(--primary)]/80"
              >
                {stat.linkLabel}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
