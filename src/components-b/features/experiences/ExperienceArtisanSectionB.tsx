"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { AvailabilityCalendarB } from "@b/features/local-experts/AvailabilityCalendarB";
import type { ExperiencePerson } from "@/types/person";
import { bEase } from "@/lib/variant-b-motion";


const sectionReveal = {
  initial: { opacity: 0, y: 10 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" as const },
  transition: { duration: 0.5, ease: bEase },
};

const HEADING_BY_TYPE: Record<string, string> = {
  artisan: "Meet the Artisan",
  guide: "Your Guide",
  interpreter: "Your Interpreter",
};

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    lead: "Lead",
    assistant: "Assistant",
    interpreter: "Interpreter",
  };
  return labels[role] || role;
}

type Props = {
  people: ExperiencePerson[];
  experienceSlug?: string;
};

export function ExperienceArtisanSectionB({ people, experienceSlug }: Props) {
  if (people.length === 0) return null;

  const primary = people.find((p) => p.is_primary) || people[0];
  const heading = HEADING_BY_TYPE[primary!.type] ?? "Your Guide";

  return (
    <motion.section
      className="border-t border-[var(--border)] bg-white"
      {...sectionReveal}
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
          {heading}
        </p>

        <div
          className={`mt-6 grid gap-6 ${
            people.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"
          }`}
        >
          {people.map((person, i) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.08, ease: bEase }}
              whileHover={{
                y: -2,
                transition: { type: "spring", stiffness: 300, damping: 20 },
              }}
              className="rounded-2xl bg-white p-6"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                {person.photo_url && (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={person.photo_url}
                      alt={person.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">
                      {person.name}
                    </h3>
                    {person.name_japanese && (
                      <span className="text-sm text-[var(--muted-foreground)]">
                        {person.name_japanese}
                      </span>
                    )}
                  </div>

                  {people.length > 1 && (
                    <span className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium text-[var(--primary)]"
                      style={{ backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
                    >
                      {roleLabel(person.role)}
                    </span>
                  )}

                  {person.bio && (
                    <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-body)]">
                      {person.bio}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {person.years_experience && (
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {person.years_experience}+ years
                      </span>
                    )}
                    {person.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {person.specialties.map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {person.languages.length > 0 && (
                    <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                      Speaks {person.languages.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        {/* Availability calendar for primary artisan/guide */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2, ease: bEase }}
          className="mt-8"
        >
          <AvailabilityCalendarB
            person={primary!}
            experienceSlug={experienceSlug}
          />
        </motion.div>
      </div>
    </motion.section>
  );
}
