"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { GuideSummary } from "@/types/guide";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

type FeaturedGuidesBProps = {
  guides: GuideSummary[];
};

export function FeaturedGuidesB({ guides }: FeaturedGuidesBProps) {
  if (!guides || guides.length === 0) return null;

  return (
    <section className="bg-white py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: bEase }}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]"
          >
            Guides
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.08, ease: bEase }}
            className="mt-3 text-3xl font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-4xl"
          >
            Read before you go
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.16, ease: bEase }}
            className="mt-3 text-[var(--foreground-body)]"
          >
            In-depth guides written by people who live here — not content farms.
          </motion.p>
        </div>

        {/* Cards */}
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {guides.slice(0, 3).map((guide, i) => (
            <motion.div
              key={guide.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{
                duration: 0.6,
                delay: 0.1 + i * 0.08,
                ease: bEase,
              }}
              whileHover={{
                y: -4,
                transition: { type: "spring", stiffness: 300, damping: 25 },
              }}
              className="transition-shadow duration-300 hover:shadow-[var(--shadow-elevated)]"
              style={{ borderRadius: "1rem" }}
            >
              <Link
                href={`/b/guides/${guide.id}`}
                className="group block overflow-hidden rounded-2xl bg-[var(--background)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={
                      guide.thumbnailImage ??
                      guide.featuredImage ??
                      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&q=75"
                    }
                    alt={guide.title}
                    fill
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  {/* Subtle bottom gradient for text legibility if needed */}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-[var(--foreground)] transition-colors duration-200 group-hover:text-[var(--primary)]">
                    {guide.title}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {[
                      guide.city ?? guide.region,
                      guide.readingTimeMinutes
                        ? `${guide.readingTimeMinutes} min read`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-10 text-center"
        >
          <Link
            href="/b/guides"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] px-6 text-sm font-medium text-[var(--foreground)] transition-all duration-200 hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            View All Guides
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
