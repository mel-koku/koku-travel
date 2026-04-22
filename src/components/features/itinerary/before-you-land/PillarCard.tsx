"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/utils";
import type { AssembledPillar } from "@/types/culturalBriefing";
import { easeEditorial } from "@/lib/motion";

/**
 * Normalize ASCII double-hyphens (`--`) and unicode em-dashes (`—`) to periods,
 * matching the brand voice rule that forbids em-dashes in user-facing copy.
 * Sanity content occasionally slips them through; this is a last-mile guardrail.
 */
function normalizeProse(s: string): string {
  return s.replace(/\s*(?:--|—)\s*/g, ". ");
}

type PillarCardProps = {
  pillar: AssembledPillar;
  defaultExpanded?: boolean;
};

export function PillarCard({ pillar, defaultExpanded = false }: PillarCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const behaviorCount = pillar.behaviors.length;

  return (
    <div
      id={pillar.slug}
      className="scroll-mt-24 rounded-lg bg-surface shadow-[var(--shadow-card)]"
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-start gap-4 px-4 py-5 text-left sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <div className={cn(typography({ intent: "utility-h2" }))}>
            {pillar.name}
          </div>
          <div className="mt-0.5 text-xs text-foreground-secondary">
            <span className="font-mono">{pillar.japanese}</span>
            <span className="mx-1.5 opacity-50">·</span>
            <span>{pillar.pronunciation}</span>
          </div>
          <p className="mt-2 text-sm text-foreground-body">
            {normalizeProse(pillar.briefIntro)}
          </p>
          {!expanded && (
            <p className="mt-2 text-xs text-stone">
              {behaviorCount} tip{behaviorCount !== 1 ? "s" : ""} for your trip
            </p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "mt-1 h-4 w-4 shrink-0 text-foreground-secondary transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [...easeEditorial] as [number, number, number, number] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 pt-4 pb-5 sm:px-5">
              <div className="space-y-3">
                <p className={typography({ intent: "editorial-prose" })}>
                  {normalizeProse(pillar.concept)}
                </p>
                <p className={typography({ intent: "utility-body" })}>
                  {normalizeProse(pillar.inPractice)}
                </p>
                <p className={typography({ intent: "utility-body-muted" })}>
                  {normalizeProse(pillar.forTravelers)}
                </p>
              </div>

              {pillar.behaviors.length > 0 && (
                <div className="mt-5 space-y-3">
                  {pillar.behaviors.map((behavior, i) => (
                    <div
                      key={`${behavior.situation}-${i}`}
                      className={cn(
                        "rounded-md px-4 py-3",
                        behavior.severity === "critical"
                          ? "bg-nasu-tint"
                          : behavior.severity === "important"
                            ? "bg-canvas"
                            : "bg-transparent",
                      )}
                    >
                      {behavior.severity === "critical" && (
                        <p className="eyebrow-mono mb-1.5 text-error">
                          Good to know
                        </p>
                      )}
                      <p className="text-sm font-medium text-foreground">
                        {normalizeProse(behavior.situation)}
                      </p>
                      <p className="mt-0.5 text-sm text-foreground-body">
                        {normalizeProse(behavior.action)}
                      </p>
                      <p className="mt-0.5 text-xs text-foreground-secondary">
                        {normalizeProse(behavior.why)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
