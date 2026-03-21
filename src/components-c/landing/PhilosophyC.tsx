"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type PhilosophyCProps = {
  locationCount: number;
  content?: LandingPageContent;
};

const cEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay, ease: cEase },
  },
});

const scaleIn = (delay = 0) => ({
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, delay, ease: cEase },
  },
});

export function PhilosophyC({ locationCount, content }: PhilosophyCProps) {
  const noMotion = !!useReducedMotion();
  const stats = content?.philosophyStats;

  return (
    <section
      aria-label="Our philosophy"
      className="bg-[var(--surface)]"
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="py-24 sm:py-32 lg:py-48">

          <div className="lg:grid lg:grid-cols-12 lg:gap-4">
            <div className="lg:col-span-8">
              {/* Eyebrow: fades in first */}
              <motion.p
                initial={noMotion ? undefined : "hidden"}
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeUp(0)}
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]"
              >
                {content?.philosophyEyebrow ?? "Locally sourced, locally verified"}
              </motion.p>

              {/* Heading: fades in second */}
              <motion.h2
                initial={noMotion ? undefined : "hidden"}
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeUp(0.1)}
                className="mt-8 leading-[1.05] lg:mt-12"
                style={{
                  fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
                  fontSize: "clamp(2rem, 4.5vw, 4rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "var(--foreground)",
                }}
              >
                {content?.philosophyHeading ??
                  "From years of living here. Not a desk."}
              </motion.h2>
            </div>
          </div>

          {/* Stats: each block scales in with stagger */}
          <div className="mt-16 grid grid-cols-1 gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3 lg:mt-24">
            {/* Stat 1 */}
            <motion.div
              initial={noMotion ? undefined : "hidden"}
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={scaleIn(0)}
              className="flex flex-col justify-between bg-[var(--background)] p-8 lg:p-12"
            >
              <div
                style={{
                  fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
                  fontSize: "clamp(3rem, 5vw, 5rem)",
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                }}
              >
                <AnimatedNumber
                  value={locationCount}
                  className="leading-none text-[var(--foreground)]"
                />
              </div>
              <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                {stats?.[0]?.label ?? "Places we've spent time in"}
              </p>
            </motion.div>

            {/* Stat 2 */}
            <motion.div
              initial={noMotion ? undefined : "hidden"}
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={scaleIn(0.08)}
              className="flex flex-col justify-between bg-[var(--background)] p-8 lg:p-12"
            >
              <div
                style={{
                  fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
                  fontSize: "clamp(3rem, 5vw, 5rem)",
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                }}
              >
                <AnimatedNumber
                  value={(() => {
                    const parsed = stats?.[1]?.value
                      ? parseInt(stats[1].value, 10)
                      : 629;
                    return isNaN(parsed) ? 629 : parsed;
                  })()}
                  className="leading-none text-[var(--foreground)]"
                />
              </div>
              <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                {stats?.[1]?.label ?? "People who know the ground"}
              </p>
            </motion.div>

            {/* Stat 3: vermillion block */}
            <motion.div
              initial={noMotion ? undefined : "hidden"}
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={scaleIn(0.16)}
              className="flex flex-col justify-between bg-[var(--primary)] p-8 lg:p-12"
            >
              <span
                className="leading-none text-white"
                style={{
                  fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
                  fontSize: "clamp(3rem, 5vw, 5rem)",
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                }}
              >
                {stats?.[2]?.value ?? "90"}
                {stats?.[2]?.suffix ?? "+"}
              </span>
              <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                {stats?.[2]?.label ?? "Guides written on the ground"}
              </p>
            </motion.div>
          </div>

        </div>
      </div>

      <div className="border-b border-[var(--border)]" />
    </section>
  );
}
