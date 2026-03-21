"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type ShowcaseCProps = {
  content?: LandingPageContent;
};

type StepData = {
  num: string;
  title: string;
  desc: string;
};

const defaultSteps: StepData[] = [
  {
    num: "01",
    title: "Places worth knowing by name",
    desc: "Pick when you arrive and which airport. We handle the rest.",
  },
  {
    num: "02",
    title: "Build your days, your way",
    desc: "Temples, street food, nightlife, nature. Tell us what pulls you.",
  },
  {
    num: "03",
    title: "Your itinerary, everywhere",
    desc: "Every day planned with real transit, real hours, real walking distances.",
  },
];

function resolveSteps(content?: LandingPageContent): StepData[] {
  if (content?.showcaseActs?.length === 3) {
    return content.showcaseActs.map((act) => ({
      num: act.number,
      title: act.title,
      desc: act.description,
    }));
  }
  return defaultSteps;
}

const cEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: cEase },
  }),
};

const slideRight = {
  hidden: { opacity: 0, x: 24 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, delay: i * 0.12, ease: cEase },
  }),
};

export function ShowcaseC({ content }: ShowcaseCProps) {
  const prefersReducedMotion = useReducedMotion();
  const steps = resolveSteps(content);

  return (
    <section
      aria-label="How it works"
      data-section-accent
      className="relative overflow-hidden bg-[var(--background)]"
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="py-24 sm:py-32 lg:py-48">
          {/* 12-col grid: large statement left, steps right */}
          <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-10">

            {/* Statement */}
            <motion.div
              initial={prefersReducedMotion ? undefined : "hidden"}
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="lg:col-span-5"
            >
              <motion.p
                variants={fadeUp}
                custom={0}
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50"
              >
                How It Works
              </motion.p>
              <motion.h2
                variants={fadeUp}
                custom={1}
                className="mt-8 leading-[1.05] text-white lg:mt-12"
                style={{
                  fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
                  fontSize: "clamp(2rem, 4vw, 3.5rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                }}
              >
                Dates in, days out.
              </motion.h2>
            </motion.div>

            {/* Steps: right column, numbered list */}
            <motion.div
              initial={prefersReducedMotion ? undefined : "hidden"}
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="mt-12 lg:col-span-6 lg:col-start-7 lg:mt-0"
            >
              {steps.map((step, i) => (
                <motion.div
                  key={step.num}
                  variants={slideRight}
                  custom={i + 1}
                  className="border-t border-white/20 py-8 lg:py-10"
                >
                  <div className="flex items-start gap-6">
                    <span
                      className="text-white/30"
                      style={{
                        fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
                        fontSize: "clamp(2rem, 3vw, 3rem)",
                        fontWeight: 800,
                        letterSpacing: "-0.04em",
                        lineHeight: 1,
                      }}
                    >
                      {step.num}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-white"
                        style={{ letterSpacing: "-0.01em" }}
                      >
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-white/60">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              <div className="pt-4">
                <Link
                  href="/c/trip-builder"
                  className="inline-flex h-14 items-center justify-center bg-white px-10 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--primary)] transition-opacity duration-200 hover:opacity-90 active:scale-[0.98]"
                >
                  Start Building
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
