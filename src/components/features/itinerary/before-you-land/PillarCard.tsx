"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/utils";
import type { AssembledPillar } from "@/types/culturalBriefing";
import { easeEditorial } from "@/lib/motion";

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
          <div className="flex items-baseline gap-2">
            <span className={cn(typography({ intent: "editorial-h3" }), "leading-tight")}>
              {pillar.japanese}
            </span>
            <span className={typography({ intent: "utility-h2" })}>
              {pillar.name}
            </span>
            <span className="text-xs text-foreground-secondary">
              ({pillar.pronunciation})
            </span>
          </div>
          <p className="mt-1 text-sm text-foreground-secondary">
            {pillar.briefIntro}
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
                  {pillar.concept}
                </p>
                <p className={typography({ intent: "utility-body" })}>
                  {pillar.inPractice}
                </p>
                <p className={typography({ intent: "utility-body-muted" })}>
                  {pillar.forTravelers}
                </p>
              </div>

              {pillar.behaviors.length > 0 && (
                <div className="mt-5 space-y-3">
                  {pillar.behaviors.map((behavior, i) => (
                    <div
                      key={`${behavior.situation}-${i}`}
                      className={cn(
                        "rounded-md border-l-2 py-2 pr-3 pl-3",
                        behavior.severity === "critical"
                          ? "border-l-error bg-[var(--nasu-tint)]"
                          : behavior.severity === "important"
                            ? "border-l-border bg-canvas"
                            : "border-l-transparent",
                      )}
                    >
                      {behavior.severity === "critical" && (
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-error">
                          Important
                        </span>
                      )}
                      <p className="text-sm font-medium text-foreground">
                        {behavior.situation}
                      </p>
                      <p className="mt-0.5 text-sm text-foreground-body">
                        {behavior.action}
                      </p>
                      <p className="mt-0.5 text-xs text-foreground-secondary">
                        {behavior.why}
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
