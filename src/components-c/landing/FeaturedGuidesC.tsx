"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { GuideSummary } from "@/types/guide";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type FeaturedGuidesCProps = {
  guides: GuideSummary[];
  content?: LandingPageContent;
};

const cEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: cEase },
  }),
};

export function FeaturedGuidesC({ guides, content }: FeaturedGuidesCProps) {
  const prefersReducedMotion = useReducedMotion();
  if (!guides.length) return null;

  return (
    <section
      aria-label="Featured guides"
      className="bg-[var(--surface)]"
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="py-24 sm:py-32 lg:py-48">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                {content?.featuredGuidesEyebrow ?? "Guides"}
              </p>
              <h2
                className="mt-4 leading-[1.1]"
                style={{
                  fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
                  fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "var(--foreground)",
                }}
              >
                {content?.featuredGuidesHeading ?? "Written on the ground"}
              </h2>
            </div>
            <Link
              href="/c/guides"
              className="hidden text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--primary)] transition-opacity hover:opacity-70 sm:block"
            >
              All Guides
            </Link>
          </div>

          {/* Horizontal row: each guide is a tall card in a 3-col grid */}
          <div className="mt-12 grid grid-cols-1 gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3 lg:mt-16">
            {guides.slice(0, 3).map((guide, i) => {
              const imageSrc =
                guide.thumbnailImage ?? guide.featuredImage ?? null;

              return (
                <motion.article
                  key={guide.id}
                  initial={prefersReducedMotion ? undefined : "hidden"}
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={fadeUp}
                  custom={i}
                  className="group bg-[var(--background)]"
                >
                  <Link href={`/c/guides/${guide.id}`} className="block">
                    <div className="relative aspect-[3/2] overflow-hidden">
                      {imageSrc ? (
                        <Image
                          src={imageSrc}
                          alt={guide.title}
                          fill
                          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                          sizes="(max-width: 640px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-[var(--surface)]">
                          <span className="text-sm text-[var(--muted-foreground)]">
                            No image
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-5 lg:p-6">
                      {guide.region && (
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                          {guide.region}
                        </p>
                      )}
                      <h3
                        className="mt-2 text-base font-bold leading-snug text-[var(--foreground)] transition-colors duration-200 group-hover:text-[var(--primary)] lg:text-lg"
                        style={{ letterSpacing: "-0.01em" }}
                      >
                        {guide.title}
                      </h3>
                      {guide.summary && (
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                          {guide.summary}
                        </p>
                      )}
                    </div>
                  </Link>
                </motion.article>
              );
            })}
          </div>

          <div className="mt-8 sm:hidden">
            <Link
              href="/c/guides"
              className="inline-flex h-12 items-center justify-center border border-[var(--foreground)] px-8 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--foreground)] transition-colors hover:bg-[var(--foreground)] hover:text-[var(--background)]"
            >
              All Guides
            </Link>
          </div>
        </div>
      </div>

      <div className="border-b border-[var(--border)]" />
    </section>
  );
}
