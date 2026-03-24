"use client";

import Image from "next/image";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { AvailabilityCalendar } from "@/components/features/local-experts/AvailabilityCalendar";
import type { ExperiencePerson } from "@/types/person";

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

export function ExperienceArtisanSection({ people, experienceSlug }: Props) {
  if (people.length === 0) return null;

  const primary = people.find((p) => p.is_primary) || people[0];
  const heading = HEADING_BY_TYPE[primary!.type] ?? "Your Guide";

  return (
    <section className="bg-canvas py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-6">
        <ScrollReveal>
          <p className="eyebrow-editorial mb-6">{heading}</p>
        </ScrollReveal>

        <div
          className={`grid gap-6 ${
            people.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"
          }`}
        >
          {people.map((person, i) => (
            <ScrollReveal key={person.id} delay={i * 0.1}>
              <div className="flex flex-col items-start gap-5 rounded-lg bg-surface p-6 sm:flex-row sm:items-center">
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
                    <h3 className="text-lg font-semibold text-foreground">
                      {person.name}
                    </h3>
                    {person.name_japanese && (
                      <span className="text-sm text-foreground-secondary">
                        {person.name_japanese}
                      </span>
                    )}
                  </div>

                  {people.length > 1 && (
                    <span className="mt-1 inline-block rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-medium text-brand-primary">
                      {roleLabel(person.role)}
                    </span>
                  )}

                  {person.bio && (
                    <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
                      {person.bio}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {person.years_experience && (
                      <span className="text-xs text-stone">
                        {person.years_experience}+ years
                      </span>
                    )}
                    {person.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {person.specialties.map((s) => (
                          <span
                            key={s}
                            className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground-secondary"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {person.languages.length > 0 && (
                    <p className="mt-2 text-xs text-stone">
                      Speaks {person.languages.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Availability calendar for primary artisan/guide */}
        <ScrollReveal>
          <div className="mt-8">
            <AvailabilityCalendar
              person={primary!}
              experienceSlug={experienceSlug}
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
