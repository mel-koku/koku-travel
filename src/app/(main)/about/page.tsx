import type { Metadata } from "next";
import { Github, Linkedin, Twitter, Globe } from "lucide-react";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/cn";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export const metadata: Metadata = {
  title: "About | Yuku Japan",
  description:
    "Yuku is a Japan trip planning tool built by a solo founder for curious travelers. Local knowledge, smart planning, and a deep love for Japan.",
  alternates: {
    canonical: "/about",
  },
};

type TeamMember = {
  name: string;
  role: string;
  bio: string;
  image: string;
  links: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
};

const team: TeamMember[] = [
  {
    name: "Meljun Picardal",
    role: "Founder",
    bio: "Full-stack developer and Japan travel obsessive. Built Yuku to solve the trip planning problem he kept running into himself.",
    image: "/team/meljun.jpg",
    links: {
      github: "https://github.com/meljunpicardal",
      linkedin: "https://linkedin.com/in/meljunpicardal",
    },
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-[100dvh]">
      {/* ── Hero ─────────────────────────────────── */}
      <section className="bg-background px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <ScrollReveal>
            <p className="eyebrow-editorial mb-4">Our Story</p>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h1 className={cn(typography({ intent: "editorial-h1" }), "mb-6")}>
              Built for the trips guidebooks can&apos;t plan
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.16}>
            <p className={cn(typography({ intent: "utility-body" }), "mx-auto max-w-2xl text-foreground-secondary")}>
              Yuku started with a simple frustration: planning a trip to Japan
              meant drowning in blog posts, spreadsheets, and conflicting
              advice. There had to be a better way.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── The Why ──────────────────────────────── */}
      <section className="bg-canvas px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <ScrollReveal>
            <h2 className={cn(typography({ intent: "editorial-h2" }), "mb-8")}>
              Why Yuku exists
            </h2>
          </ScrollReveal>
          <div className="space-y-5">
            <ScrollReveal delay={0.08}>
              <p className={cn(typography({ intent: "utility-body" }), "text-foreground-secondary")}>
                Japan rewards the traveler who goes deeper. The small tonkatsu
                shop three blocks from the station. The mountain shrine that
                empties out by mid-afternoon. The neighborhood onsen where
                regulars nod hello. These moments don&apos;t show up in a top-ten
                list.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.16}>
              <p className={cn(typography({ intent: "utility-body" }), "text-foreground-secondary")}>
                Yuku exists to close the gap between what&apos;s possible in Japan
                and what most visitors actually experience. We built a planning
                tool that draws on local knowledge, handles the logistics, and
                gives you back the space to be curious.
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── What We Believe ──────────────────────── */}
      <section className="bg-background px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <ScrollReveal>
            <h2 className={cn(typography({ intent: "editorial-h2" }), "mb-8")}>
              What we believe
            </h2>
          </ScrollReveal>
          <div className="space-y-5">
            <ScrollReveal delay={0.08}>
              <p className={cn(typography({ intent: "utility-body" }), "text-foreground-secondary")}>
                <strong className="text-foreground">Depth over breadth.</strong>{" "}
                A great trip isn&apos;t about checking off landmarks. It&apos;s about
                spending enough time in one place to feel the rhythm of it.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.16}>
              <p className={cn(typography({ intent: "utility-body" }), "text-foreground-secondary")}>
                <strong className="text-foreground">Local knowledge first.</strong>{" "}
                Every location in Yuku is sourced and vetted with care. We
                don&apos;t scrape lists. We talk to people who live there.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.24}>
              <p className={cn(typography({ intent: "utility-body" }), "text-foreground-secondary")}>
                <strong className="text-foreground">Planning should feel good.</strong>{" "}
                Trip planning is part of the journey. Yuku is designed to make
                that process feel exciting, not exhausting.
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Team ─────────────────────────────────── */}
      <section className="bg-canvas px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <ScrollReveal>
            <p className="eyebrow-editorial mb-4">The Team</p>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h2 className={cn(typography({ intent: "editorial-h2" }), "mb-12")}>
              Who&apos;s behind Yuku
            </h2>
          </ScrollReveal>

          {/* Single centered card -- becomes a grid when team grows */}
          <ScrollReveal delay={0.16}>
            <div className="mx-auto max-w-sm">
              {team.map((member) => (
                <div key={member.name} className="flex flex-col items-center text-center">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="mb-6 h-40 w-40 rounded-lg object-cover shadow-[var(--shadow-card)]"
                  />
                  <h3 className={typography({ intent: "utility-h2" })}>
                    {member.name}
                  </h3>
                  <p className="mt-1 text-foreground-secondary">{member.role}</p>
                  <p className={cn(typography({ intent: "utility-body" }), "mt-4 text-foreground-secondary")}>
                    {member.bio}
                  </p>

                  {/* Social links */}
                  <div className="mt-4 flex gap-3">
                    {member.links.github && (
                      <a
                        href={member.links.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} on GitHub`}
                        className="flex h-11 w-11 items-center justify-center rounded-md text-foreground-secondary transition-colors hover:text-brand-primary"
                      >
                        <Github className="h-5 w-5" />
                      </a>
                    )}
                    {member.links.linkedin && (
                      <a
                        href={member.links.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} on LinkedIn`}
                        className="flex h-11 w-11 items-center justify-center rounded-md text-foreground-secondary transition-colors hover:text-brand-primary"
                      >
                        <Linkedin className="h-5 w-5" />
                      </a>
                    )}
                    {member.links.twitter && (
                      <a
                        href={member.links.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} on Twitter`}
                        className="flex h-11 w-11 items-center justify-center rounded-md text-foreground-secondary transition-colors hover:text-brand-primary"
                      >
                        <Twitter className="h-5 w-5" />
                      </a>
                    )}
                    {member.links.website && (
                      <a
                        href={member.links.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name}'s website`}
                        className="flex h-11 w-11 items-center justify-center rounded-md text-foreground-secondary transition-colors hover:text-brand-primary"
                      >
                        <Globe className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────── */}
      <section className="bg-background px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <ScrollReveal>
            <h2 className={cn(typography({ intent: "editorial-h2" }), "mb-4")}>
              Plan your next trip
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <p className={cn(typography({ intent: "utility-body" }), "mx-auto mb-8 max-w-lg text-foreground-secondary")}>
              Tell us where you want to go and how you like to travel. Yuku
              handles the rest.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.16}>
            <a
              href="/trip-builder"
              className="btn-yuku inline-flex h-14 items-center justify-center rounded-lg bg-brand-primary px-10 text-sm font-semibold uppercase tracking-wider text-white shadow-[var(--shadow-glow)] hover:bg-brand-secondary active:scale-[0.98]"
            >
              <span className="relative">Build My Trip</span>
            </a>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
