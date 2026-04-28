"use client";

import { useRef } from "react";
import { m, useInView } from "framer-motion";
import { easeReveal, durationBase } from "@/lib/motion";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/utils";

const QA_ITEMS = [
  { q: "Is my schedule too packed?", a: "Your Tuesday has four stops and two train transfers. Tight but doable. Want me to loosen it?" },
  { q: "What if it rains tomorrow?", a: "Shift the garden walk to Friday. Swap in the craft museum nearby. Same area, indoor." },
  { q: "How do I get between these places?", a: "Ginza Line to Omotesando, then a 6-minute walk. Platform 2 toward Shibuya." },
  { q: "Any etiquette tips for today's stops?", a: "The temple asks for silence past the gate. Shoes off at the tatami room." },
  { q: "Suggest a quick coffee break.", a: "Glitch Coffee is a 4-minute detour from your 2pm stop. Pour-over, no laptops." },
  { q: "Can I swap this day trip?", a: "Kamakura fits your pace better than Nikko. Shorter train, similar vibe. Want me to swap it?" },
  { q: "What should I eat for lunch here?", a: "The shotengai two blocks east has a tonkatsu shop regulars swear by. Closed Tuesdays." },
  { q: "Can I adjust the pace mid-trip?", a: "Yes. Tap any day and tell me it's too busy or too light. I rebalance." },
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
    <m.div
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
      <div className="rounded-lg bg-surface px-5 py-3.5 shadow-[var(--shadow-card)]">
        <p className={cn(typography({ intent: "utility-body" }), "text-sm font-medium")}>
          {q}
        </p>
        <m.p
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
        </m.p>
      </div>
    </m.div>
  );
}

export function AskYukuPreview() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-10%" });

  return (
    <section aria-label="Ask Yuku" className="bg-canvas py-12 sm:py-20 lg:py-28">
      <div ref={sectionRef} className="mx-auto max-w-7xl px-6">
        {/* Heading */}
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: durationBase, ease: [...easeReveal] as [number, number, number, number] }}
          className="text-center"
        >
          <p className="eyebrow-mono">Ask Yuku</p>
          <h2 className={cn(typography({ intent: "editorial-h2" }), "mx-auto mt-4 max-w-xl")}>
            Travel questions, answered in the context of your trip.
          </h2>
        </m.div>

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
            <m.div
              key={chat.q}
              initial={{ opacity: 0, y: 12 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{
                duration: durationBase,
                delay: 0.1 + i * 0.08,
                ease: [...easeReveal] as [number, number, number, number],
              }}
              className="rounded-lg bg-surface px-5 py-3.5 shadow-[var(--shadow-card)]"
            >
              <p className={cn(typography({ intent: "utility-body" }), "text-sm font-medium")}>
                {chat.q}
              </p>
              <p className={cn(typography({ intent: "utility-body-muted" }), "mt-1.5 text-sm")}>
                {chat.a}
              </p>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  );
}
