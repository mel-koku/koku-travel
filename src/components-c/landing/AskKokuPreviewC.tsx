"use client";

import { motion, useReducedMotion } from "framer-motion";

const cEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: cEase },
  }),
};

const QUESTIONS = [
  {
    q: "Best ramen near Shinjuku station?",
    a: "Fuunji, 3-minute walk from the south exit. Get the tsukemen.",
  },
  {
    q: "Day trip from Osaka worth taking?",
    a: "Nara. 45 minutes by train, deer park, Todai-ji temple. Back by dinner.",
  },
  {
    q: "Cherry blossoms in Hokkaido, when?",
    a: "Early to mid-May. About a month after Tokyo peaks.",
  },
];

export function AskKokuPreviewC() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      aria-label="Ask Koku"
      className="bg-[var(--background)]"
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="py-24 sm:py-32 lg:py-48">
          {/* Header: left-aligned in 8 cols */}
          <div className="lg:grid lg:grid-cols-12 lg:gap-4">
            <div className="lg:col-span-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Ask Koku
              </p>
              <h2
                className="mt-4 leading-[1.1]"
                style={{
                  fontFamily:
                    "var(--font-plus-jakarta), system-ui, sans-serif",
                  fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "var(--foreground)",
                }}
              >
                Questions? We know the answer.
              </h2>
            </div>
          </div>

          {/* Q&A cards: gap-px grid */}
          <motion.div
            initial={prefersReducedMotion ? undefined : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="mt-12 grid grid-cols-1 gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3 lg:mt-16"
          >
            {QUESTIONS.map((chat, i) => (
              <motion.div
                key={chat.q}
                variants={fadeUp}
                custom={i}
                className="bg-[var(--background)] p-6 lg:p-8"
              >
                <p className="text-sm font-bold text-[var(--foreground)]">
                  {chat.q}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {chat.a}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
      <div className="border-b border-[var(--border)]" />
    </section>
  );
}
