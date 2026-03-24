"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { ExperienceCard } from "@/components/features/experiences/ExperienceCard";
import { useWorkshopExperiences } from "@/hooks/useWorkshopExperiences";
import { typography } from "@/lib/typography-system";
import type { CraftTypeId } from "@/data/craftTypes";

const easeReveal = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

type CraftWorkshopSectionProps = {
  selectedCraftType?: CraftTypeId | null;
};

export function CraftWorkshopSection({ selectedCraftType }: CraftWorkshopSectionProps) {
  const { data: workshops, isLoading } = useWorkshopExperiences(selectedCraftType);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (isLoading || !workshops || workshops.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 bg-canvas">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeReveal }}
      >
        <div className="flex items-baseline justify-between mb-5">
          <h2 className={typography({ intent: "editorial-h3" })}>
            Book a Workshop
          </h2>
          <span className="font-mono text-xs text-stone">
            {workshops.length} {workshops.length === 1 ? "workshop" : "workshops"}
          </span>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory overscroll-contain pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        >
          {workshops.map((exp, i) => (
            <div
              key={exp._id}
              className="snap-start shrink-0 w-[280px] sm:w-[300px]"
            >
              <ExperienceCard experience={exp} index={i} eager={i < 3} />
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
