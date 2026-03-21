"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { GuideCardC } from "./GuideCardC";
import { fadeUp } from "@c/ui/motionC";
import type { GuideSummary, GuideType } from "@/types/guide";
import type { PagesContent } from "@/types/sanitySiteContent";
import { getCurrentSeason, type Season } from "@/lib/utils/seasonUtils";

const GUIDE_TYPE_OPTIONS: { value: GuideType; label: string }[] = [
  { value: "itinerary", label: "Itinerary" },
  { value: "listicle", label: "Top Picks" },
  { value: "deep_dive", label: "Deep Dive" },
  { value: "seasonal", label: "Seasonal" },
  { value: "activity", label: "Activities" },
  { value: "blog", label: "Blog" },
];

const SEASON_OPTIONS: { value: string; label: string }[] = [
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "autumn", label: "Autumn" },
  { value: "winter", label: "Winter" },
];

function seasonToDbSeason(season: Season): string {
  return season === "fall" ? "autumn" : season;
}

type GuidesPageClientCProps = {
  guides: GuideSummary[];
  content?: PagesContent;
};

export function GuidesPageClientC({ guides, content }: GuidesPageClientCProps) {
  const searchParams = useSearchParams();
  const prefersReducedMotion = useReducedMotion();
  const initialType = searchParams.get("type") as GuideType | null;
  const [selectedType, setSelectedType] = useState<GuideType | null>(
    initialType && GUIDE_TYPE_OPTIONS.some((o) => o.value === initialType) ? initialType : null
  );
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [isStuck, setIsStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setIsStuck(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-72px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    guides.forEach((g) => {
      counts[g.guideType] = (counts[g.guideType] || 0) + 1;
    });
    return counts;
  }, [guides]);

  const seasonCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    guides.forEach((g) => {
      if (g.seasons) {
        for (const s of g.seasons) {
          if (s !== "year-round") {
            counts[s] = (counts[s] || 0) + 1;
          }
        }
      }
    });
    return counts;
  }, [guides]);

  const filterTypes = useMemo(
    () =>
      GUIDE_TYPE_OPTIONS.filter((o) => (typeCounts[o.value] || 0) > 0).map(
        (o) => ({ value: o.value, label: o.label, count: typeCounts[o.value] || 0 })
      ),
    [typeCounts]
  );

  const filterSeasons = useMemo(
    () =>
      SEASON_OPTIONS.map(
        (o) => ({ value: o.value, label: o.label, count: seasonCounts[o.value] || 0 })
      ),
    [seasonCounts]
  );

  const currentDbSeason = seasonToDbSeason(getCurrentSeason());
  const hasCurrentSeasonGuides = (seasonCounts[currentDbSeason] || 0) > 0;

  const filteredGuides = useMemo(() => {
    let result = guides;
    if (selectedType) result = result.filter((g) => g.guideType === selectedType);
    if (selectedSeason) result = result.filter((g) => g.seasons?.includes(selectedSeason));
    return result;
  }, [guides, selectedType, selectedSeason]);

  // Empty state: no guides at all
  if (guides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6">
        <p
          className="text-lg font-bold text-[var(--foreground)]"
          style={{ letterSpacing: "-0.03em" }}
        >
          {content?.guidesEmptyHeading ?? "Guides are in the works"}
        </p>
        <p className="mt-2 text-sm text-[var(--muted-foreground)] text-center max-w-sm">
          {content?.guidesEmptyDescription ?? "Still writing these. Browse places while we finish."}
        </p>
        <a
          href="/c/places"
          className="mt-8 inline-flex h-11 items-center justify-center bg-[var(--primary)] px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          Browse Places
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-[1400px] px-6 lg:px-10 pt-32 lg:pt-40 pb-6">
        <motion.p
          initial={prefersReducedMotion ? undefined : "hidden"}
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp(0)}
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]"
        >
          {guides.length} guides across Japan
        </motion.p>

        <motion.h1
          initial={prefersReducedMotion ? undefined : "hidden"}
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp(0.1)}
          className="mt-4 max-w-3xl leading-[1.1]"
          style={{
            fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
            fontSize: "clamp(2rem, 4vw, 3.5rem)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--foreground)",
          }}
        >
          {content?.guidesHeading ?? "Written on the ground, not from a desk."}
        </motion.h1>

        <motion.p
          initial={prefersReducedMotion ? undefined : "hidden"}
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp(0.2)}
          className="mt-5 max-w-xl text-base leading-relaxed text-[var(--muted-foreground)]"
        >
          {content?.guidesDescription ?? "Organized by region, season, and the kind of trip you're after."}
        </motion.p>
      </section>

      {/* Sentinel for sticky detection */}
      <div ref={sentinelRef} className="h-px -mt-px" aria-hidden="true" />

      {/* Filter Bar */}
      <div
        className={cn(
          "sticky transition-[border-color] duration-300",
          isStuck ? "z-50" : "z-40"
        )}
        style={{
          top: isStuck ? "calc(var(--header-h) - 1px)" : "var(--header-h)",
          backgroundColor: "var(--background)",
          borderBottom: isStuck ? "1px solid var(--border)" : "1px solid transparent",
        }}
      >
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <div
            className="overflow-x-auto scrollbar-hide overscroll-contain py-3"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <div className="flex items-center gap-1 sm:gap-2 min-w-max">
              {/* Type filters */}
              <button
                type="button"
                onClick={() => setSelectedType(null)}
                className={cn(
                  "px-4 py-2.5 min-h-[44px] text-[11px] font-bold uppercase tracking-[0.12em] whitespace-nowrap border-b-2 transition-all",
                  selectedType === null
                    ? "border-[var(--primary)] text-[var(--foreground)]"
                    : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                All
                <span className="ml-1.5 text-[10px] font-medium text-[var(--muted-foreground)]">{guides.length}</span>
              </button>
              {filterTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedType(selectedType === type.value ? null : type.value)}
                  className={cn(
                    "px-4 py-2.5 min-h-[44px] text-[11px] font-bold uppercase tracking-[0.12em] whitespace-nowrap border-b-2 transition-all",
                    selectedType === type.value
                      ? "border-[var(--primary)] text-[var(--foreground)]"
                      : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                >
                  {type.label}
                  <span className="ml-1.5 text-[10px] font-medium text-[var(--muted-foreground)]">{type.count}</span>
                </button>
              ))}

              {/* Divider */}
              <div className="h-5 w-px bg-[var(--border)] mx-2" />

              {/* Season filters */}
              {filterSeasons.map((season) => {
                const isEmpty = season.count === 0;
                return (
                  <button
                    key={season.value}
                    type="button"
                    disabled={isEmpty}
                    onClick={() => setSelectedSeason(selectedSeason === season.value ? null : season.value)}
                    className={cn(
                      "px-3 py-2 min-h-[44px] text-[10px] font-bold uppercase tracking-[0.12em] whitespace-nowrap transition-all",
                      isEmpty
                        ? "bg-[var(--surface)] text-[var(--muted-foreground)]/40 cursor-default opacity-40"
                        : selectedSeason === season.value
                          ? "bg-[var(--primary)] text-white"
                          : "bg-[var(--surface)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                      !isEmpty && season.value === currentDbSeason && hasCurrentSeasonGuides && !selectedSeason
                        ? "ring-1 ring-[var(--primary)]/30"
                        : ""
                    )}
                  >
                    {season.label}
                    {!isEmpty && <span className="ml-1 opacity-60">{season.count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="h-6 sm:h-8" aria-hidden="true" />

      {/* Card Grid */}
      <section
        aria-label="Travel guides"
        className="mx-auto max-w-[1400px] px-6 lg:px-10 pb-24 sm:pb-32 lg:pb-48"
      >
        {filteredGuides.length > 0 ? (
          <div className="grid grid-cols-1 gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
            {filteredGuides.map((guide, i) => (
              <motion.div
                key={guide.id}
                initial={prefersReducedMotion ? undefined : "hidden"}
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={fadeUp(Math.min(i, 5) * 0.06)}
              >
                <GuideCardC guide={guide} index={i} eager={i < 3} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-start py-16">
            <p
              className="text-lg font-bold text-[var(--foreground)]"
              style={{ letterSpacing: "-0.03em" }}
            >
              {content?.guidesFilteredEmptyHeading ?? "No guides in this category yet"}
            </p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {content?.guidesFilteredEmptyDescription ?? "Try another filter, or browse them all."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
