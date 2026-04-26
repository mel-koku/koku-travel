"use client";

import { m, useReducedMotion } from "framer-motion";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/utils";
import type { AssembledPillar } from "@/types/culturalBriefing";
import { easeEditorialMut, durationBase } from "@/lib/motion";

function normalizeProse(s: string): string {
  return s.replace(/\s*(?:--|—)\s*/g, ". ");
}

type PillarSectionProps = {
  pillar: AssembledPillar;
  index: number; // 0-based
  total: number;
};

export function PillarSection({ pillar, index, total }: PillarSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  const numberLabel = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

  return (
    <section
      id={pillar.slug}
      className="relative scroll-mt-24 border-t border-border pt-12 pb-16"
    >
      {/* Decorative oversized kanji — bleeds left, sits behind content */}
      <m.div
        aria-hidden
        initial={prefersReducedMotion ? undefined : { opacity: 0, x: -40 }}
        whileInView={prefersReducedMotion ? undefined : { opacity: 0.08, x: 0 }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={{ duration: durationBase * 1.5, ease: easeEditorialMut }}
        className="pointer-events-none absolute left-[-6px] top-8 select-none font-serif text-[180px] sm:text-[220px] leading-none text-foreground opacity-[0.08]"
      >
        {pillar.japanese.split("/")[0]}
      </m.div>

      {/* Chapter number */}
      <div className="relative font-mono text-[11px] uppercase tracking-[0.22em] text-foreground-secondary mb-6">
        {numberLabel} <span className="opacity-30 mx-2" aria-hidden="true">·</span>{" "}
        <span className="text-foreground-secondary">{pillar.name}</span>
      </div>

      {/* Title */}
      <h2
        className={cn(
          typography({ intent: "editorial-h1" }),
          "relative mb-1 leading-[0.95]",
        )}
      >
        {pillar.name}
      </h2>

      {/* Romaji + kanji as eyebrow under title */}
      <div className="relative mb-8 flex items-center gap-3 text-sm text-foreground-secondary">
        <span className="font-serif text-base">{pillar.japanese}</span>
        <span className="opacity-30">·</span>
        <span className="font-mono text-xs tracking-wider">
          {pillar.pronunciation}
        </span>
      </div>

      {/* Tagline / brief intro — editorial-prose measure */}
      <p
        className={cn(
          typography({ intent: "editorial-prose" }),
          "relative max-w-[54ch] mb-10",
        )}
      >
        {normalizeProse(pillar.briefIntro)}
      </p>

      {/* Concept — larger editorial body */}
      <div className="relative max-w-[58ch] space-y-5 mb-12">
        <p className="font-serif text-[17px] leading-[1.7] text-foreground">
          {normalizeProse(pillar.concept)}
        </p>
        <p className="font-sans text-[15px] leading-[1.7] text-foreground-body">
          {normalizeProse(pillar.inPractice)}
        </p>
        <p className="font-sans text-[15px] leading-[1.7] text-foreground-secondary italic">
          {normalizeProse(pillar.forTravelers)}
        </p>
      </div>

      {/* Behaviors — numbered list with hairline dividers, no boxes */}
      {pillar.behaviors.length > 0 && (
        <div className="relative max-w-[58ch]">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground-secondary mb-5">
            Before you go
          </div>
          <ol className="divide-y divide-border/70">
            {pillar.behaviors.map((behavior, i) => (
              <li
                key={`${behavior.situation}-${i}`}
                className="flex gap-5 py-5 first:pt-0"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground-secondary shrink-0 pt-[3px] w-6">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="font-serif text-[17px] leading-snug text-foreground mb-1">
                    {normalizeProse(behavior.situation)}
                  </p>
                  <p className="text-[14px] leading-relaxed text-foreground-body mb-1">
                    {normalizeProse(behavior.action)}
                  </p>
                  <p className="text-[13px] leading-relaxed text-foreground-secondary">
                    {normalizeProse(behavior.why)}
                  </p>
                  {behavior.severity === "critical" && (
                    <span className="mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-error">
                      Important
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
