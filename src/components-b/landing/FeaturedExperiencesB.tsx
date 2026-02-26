"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { ExperienceSummary } from "@/types/experience";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

type FeaturedExperiencesBProps = {
  experiences: ExperienceSummary[];
};

export function FeaturedExperiencesB({
  experiences,
}: FeaturedExperiencesBProps) {
  if (!experiences || experiences.length === 0) return null;

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
            Experiences
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.08, ease: bEase }}
            className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-[var(--foreground)] sm:text-3xl"
          >
            Go beyond sightseeing
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.16, ease: bEase }}
            className="mt-3 text-[var(--foreground-body)]"
          >
            Workshops, tours, and adventures that connect you to the culture —
            not just the scenery.
          </motion.p>
        </div>

        {/* Cards */}
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {experiences.slice(0, 3).map((exp, i) => (
            <motion.div
              key={exp._id}
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
                href={`/b/experiences/${exp.slug}`}
                className="group block overflow-hidden rounded-2xl bg-[var(--card)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={
                      exp.featuredImage?.url ??
                      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&q=75"
                    }
                    alt={exp.title}
                    fill
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-[var(--foreground)] transition-colors duration-200 group-hover:text-[var(--primary)]">
                    {exp.title}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {[exp.city, exp.duration].filter(Boolean).join(" · ")}
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
            href="/b/experiences"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] px-6 text-sm font-medium text-[var(--foreground)] transition-all duration-200 hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            View All Experiences
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
