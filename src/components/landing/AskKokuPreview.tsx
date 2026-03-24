"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { easeReveal, durationBase } from "@/lib/motion";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/utils";

const QA_ITEMS = [
  { q: "Best ramen near Shinjuku station?", a: "Fuunji, 3-minute walk from the south exit. Get the tsukemen." },
  { q: "Day trip from Osaka worth taking?", a: "Nara. 45 minutes by train, deer park, Todai-ji." },
  { q: "Cherry blossoms in Hokkaido?", a: "Early to mid-May. About a month after Tokyo peaks." },
  { q: "IC card or buy tickets?", a: "IC card. Works on trains, buses, and convenience stores." },
  { q: "How much cash should I carry?", a: "Keep 5,000-10,000 yen for small shops. Most places take cards." },
  { q: "Is the JR Pass worth it?", a: "If you're hitting 3+ cities, yes. Do the math first." },
  { q: "Best onsen near Tokyo?", a: "Hakone. 90 minutes by Romancecar. Book a ryokan with a private bath." },
  { q: "Safe to walk around at night?", a: "Very. Japan is one of the safest countries for late-night walks." },
];

// Hand-placed positions for desktop scattered layout
// 4 rows of 2 pills, staggered left/right with vertical breathing room
const SCATTER_POSITIONS: Array<{
  x: string;
  y: string;
  rotate: number;
  direction: "left" | "right";
}> = [
  // Row 1
  { x: "0%",  y: "0px",   rotate: -1.5, direction: "left" },
  { x: "52%", y: "10px",   rotate: 2,    direction: "right" },
  // Row 2
  { x: "6%",  y: "100px",  rotate: 1,    direction: "left" },
  { x: "48%", y: "90px",   rotate: -2,   direction: "right" },
  // Row 3
  { x: "2%",  y: "195px",  rotate: -1,   direction: "left" },
  { x: "54%", y: "185px",  rotate: 1.5,  direction: "right" },
  // Row 4
  { x: "8%",  y: "285px",  rotate: 2,    direction: "left" },
  { x: "50%", y: "278px",  rotate: -1.5, direction: "right" },
];

function QAPill({
  q,
  a,
  index,
  scatter,
}: {
  q: string;
  a: string;
  index: number;
  scatter: (typeof SCATTER_POSITIONS)[number];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-5%" });

  const enterX = scatter.direction === "left" ? -30 : 30;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: enterX, rotate: 0 }}
      animate={
        isInView
          ? { opacity: 1, x: 0, rotate: scatter.rotate }
          : { opacity: 0, x: enterX, rotate: 0 }
      }
      transition={{
        duration: durationBase,
        delay: 0.1 + index * 0.1,
        ease: [...easeReveal] as [number, number, number, number],
      }}
      className="hidden lg:block absolute w-[44%]"
      style={{
        left: scatter.x,
        top: scatter.y,
      }}
    >
      <div className="rounded-2xl border border-border bg-white px-5 py-3.5 shadow-[var(--shadow-card)]">
        <p className={cn(typography({ intent: "utility-body" }), "text-sm font-medium")}>
          {q}
        </p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.3 + index * 0.1,
            ease: [...easeReveal] as [number, number, number, number],
          }}
          className={cn(typography({ intent: "utility-body-muted" }), "mt-1.5 text-sm")}
        >
          {a}
        </motion.p>
      </div>
    </motion.div>
  );
}

export function AskKokuPreview() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-10%" });

  return (
    <section aria-label="Ask Koku" className="bg-background py-12 sm:py-20 lg:py-28">
      <div ref={sectionRef} className="mx-auto max-w-7xl px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: durationBase, ease: [...easeReveal] as [number, number, number, number] }}
          className="text-center"
        >
          <p className="eyebrow-mono">Ask Koku</p>
          <h2 className={cn(typography({ intent: "editorial-h2" }), "mx-auto mt-4 max-w-xl leading-snug")}>
            Questions? We know the answer. Or we&apos;ll find it.
          </h2>
        </motion.div>

        {/* Desktop: scattered pills */}
        <div className="relative mt-12 hidden lg:block" style={{ height: "370px" }}>
          {QA_ITEMS.map((chat, i) => (
            <QAPill
              key={chat.q}
              q={chat.q}
              a={chat.a}
              index={i}
              scatter={SCATTER_POSITIONS[i]!}
            />
          ))}
        </div>

        {/* Mobile/Tablet: clean 2-col grid */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:hidden">
          {QA_ITEMS.map((chat, i) => (
            <motion.div
              key={chat.q}
              initial={{ opacity: 0, y: 12 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{
                duration: durationBase,
                delay: 0.1 + i * 0.08,
                ease: [...easeReveal] as [number, number, number, number],
              }}
              className="rounded-2xl border border-border bg-white px-5 py-3.5 shadow-[var(--shadow-card)]"
            >
              <p className={cn(typography({ intent: "utility-body" }), "text-sm font-medium")}>
                {chat.q}
              </p>
              <p className={cn(typography({ intent: "utility-body-muted" }), "mt-1.5 text-sm")}>
                {chat.a}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
