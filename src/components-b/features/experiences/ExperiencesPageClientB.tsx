"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { ExperienceCardB } from "./ExperienceCardB";
import type { ExperienceSummary, ExperienceType } from "@/types/experience";
import type { PagesContent } from "@/types/sanitySiteContent";

const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

type ExperiencesPageClientBProps = {
  experiences: ExperienceSummary[];
  content?: PagesContent;
};

const EXPERIENCE_TYPE_OPTIONS: { value: ExperienceType; label: string }[] = [
  { value: "workshop", label: "Workshop" },
  { value: "cruise", label: "Cruise" },
  { value: "tour", label: "Tour" },
  { value: "experience", label: "Cultural" },
  { value: "adventure", label: "Adventure" },
  { value: "rental", label: "Rental" },
];

export function ExperiencesPageClientB({ experiences, content }: ExperiencesPageClientBProps) {
  const [selectedType, setSelectedType] = useState<ExperienceType | null>(null);
  const [isStuck, setIsStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry) setIsStuck(!entry.isIntersecting); },
      { threshold: 0, rootMargin: "-72px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    experiences.forEach((e) => {
      counts[e.experienceType] = (counts[e.experienceType] || 0) + 1;
    });
    return counts;
  }, [experiences]);

  const filterTypes = useMemo(
    () =>
      EXPERIENCE_TYPE_OPTIONS.filter((o) => (typeCounts[o.value] || 0) > 0).map(
        (o) => ({ value: o.value, label: o.label, count: typeCounts[o.value] || 0 })
      ),
    [typeCounts]
  );

  const filteredExperiences = useMemo(() => {
    if (!selectedType) return experiences;
    return experiences.filter((e) => e.experienceType === selectedType);
  }, [experiences, selectedType]);

  if (experiences.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4">
        <p className="text-lg font-semibold text-[var(--foreground)]">
          {content?.experiencesEmptyHeading ?? "Experiences are in the works"}
        </p>
        <p className="mt-2 text-sm text-[var(--muted-foreground)] text-center max-w-sm">
          {content?.experiencesEmptyDescription ?? "Still writing these \u2014 browse places while we finish."}
        </p>
        <a
          href="/b/places"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-6 text-sm font-medium text-white transition-all hover:brightness-110 active:scale-[0.98]"
        >
          Browse places
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 lg:pt-36 pb-4 sm:pb-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: bEase }}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]"
        >
          {experiences.length} experiences across Japan
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: bEase, delay: 0.1 }}
          className="mt-4 text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.1] text-[var(--foreground)] max-w-3xl mx-auto"
        >
          {content?.experiencesHeading ?? "Workshops, cruises, and the kind of moments you'll talk about for years."}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: bEase, delay: 0.2 }}
          className="text-base text-[var(--foreground-body)] max-w-2xl mx-auto mt-6 leading-relaxed"
        >
          {content?.experiencesDescription ?? "Hands-on moments you won't find in any guidebook."}
        </motion.p>
      </section>

      {/* Sentinel — triggers sticky detection */}
      <div ref={sentinelRef} className="h-px -mt-px" aria-hidden="true" />

      {/* Filter Bar */}
      {filterTypes.length > 1 && (
        <div
          className={cn(
            "sticky transition-[background-color,box-shadow] duration-300",
            isStuck ? "z-50" : "z-40"
          )}
          style={{
            top: isStuck ? "calc(var(--header-h) - 3px)" : "var(--header-h)",
            backgroundColor: isStuck ? "rgba(255,255,255,1)" : "transparent",
            boxShadow: isStuck ? "var(--shadow-sm)" : "none",
          }}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div
              className="overflow-x-auto scrollbar-hide overscroll-contain py-3"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <div className="flex justify-center gap-1 sm:gap-2 min-w-max">
                <button
                  type="button"
                  onClick={() => setSelectedType(null)}
                  className={cn(
                    "px-4 py-2.5 min-h-[44px] text-sm font-medium tracking-wide whitespace-nowrap border-b-2 transition-all",
                    selectedType === null
                      ? "border-[var(--primary)] text-[var(--foreground)]"
                      : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                >
                  All
                  <span className="ml-1.5 text-xs text-[var(--muted-foreground)]">{experiences.length}</span>
                </button>
                {filterTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSelectedType(selectedType === type.value ? null : type.value)}
                    className={cn(
                      "px-4 py-2.5 min-h-[44px] text-sm font-medium tracking-wide whitespace-nowrap border-b-2 transition-all",
                      selectedType === type.value
                        ? "border-[var(--primary)] text-[var(--foreground)]"
                        : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    )}
                  >
                    {type.label}
                    <span className="ml-1.5 text-xs text-[var(--muted-foreground)]">{type.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="h-4 sm:h-6" aria-hidden="true" />

      {/* Grid */}
      <section
        aria-label="Experiences"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24 lg:pb-32"
      >
        {filteredExperiences.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-8">
            {filteredExperiences.map((exp, i) => (
              <motion.div
                key={exp._id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, ease: bEase, delay: 0.1 + i * 0.08 }}
              >
                <ExperienceCardB experience={exp} index={i} eager={i < 3} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-lg font-semibold text-[var(--foreground)]">
              {content?.experiencesFilteredEmptyHeading ?? "No experiences of this type yet"}
            </p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {content?.experiencesFilteredEmptyDescription ?? "Try another filter, or see everything."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
