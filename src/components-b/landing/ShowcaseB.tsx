"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type ActData = {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  alt: string;
};

const defaultActs: ActData[] = [
  {
    number: "01",
    eyebrow: "DISCOVER",
    title: "The places locals keep to themselves",
    description:
      "Found the same way you'd find them if you lived here — word of mouth, wandering, years of knowing what's worth the trip.",
    image:
      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1200&q=80",
    alt: "Traditional Japanese alley",
  },
  {
    number: "02",
    eyebrow: "PLAN",
    title: "A trip shaped around how you travel",
    description:
      "Tell us your pace, your vibes, who's coming. We build an itinerary that fits — not a template with your name on it.",
    image:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80",
    alt: "Planning a Japan trip",
  },
  {
    number: "03",
    eyebrow: "GO",
    title: "Travel with confidence, not a guidebook",
    description:
      "Real-time tips, local context, and every detail handled — so you can focus on being there.",
    image:
      "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=80",
    alt: "Exploring Japan",
  },
];

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

function resolveActs(content?: LandingPageContent): ActData[] {
  if (content?.showcaseActs?.length === 3) {
    return content.showcaseActs.map((act) => ({
      number: act.number,
      eyebrow: act.eyebrow,
      title: act.title,
      description: act.description,
      image: act.image?.url ?? defaultActs[0]!.image,
      alt: act.alt,
    }));
  }
  return [...defaultActs];
}

type ShowcaseBProps = {
  content?: LandingPageContent;
};

export function ShowcaseB({ content }: ShowcaseBProps) {
  const acts = resolveActs(content);

  return (
    <section className="bg-white py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: bEase }}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]"
          >
            How it works
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.08, ease: bEase }}
            className="mt-3 text-3xl font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-4xl"
          >
            Three steps to a better trip
          </motion.h2>
        </div>

        <div className="mt-12 flex flex-col gap-8">
          {acts.map((act, i) => {
            const imageFirst = i % 2 === 0;
            return (
              <motion.div
                key={act.number}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.6,
                  delay: 0.1 + i * 0.15,
                  ease: bEase,
                }}
                whileHover={{
                  y: -3,
                  transition: {
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  },
                }}
                className="overflow-hidden rounded-2xl transition-shadow duration-300 hover:shadow-[var(--shadow-elevated)]"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div
                  className={`grid grid-cols-1 lg:grid-cols-2 ${
                    !imageFirst ? "lg:[direction:rtl]" : ""
                  }`}
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] overflow-hidden lg:[direction:ltr]">
                    <Image
                      src={act.image}
                      alt={act.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  </div>

                  {/* Text */}
                  <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-12 lg:[direction:ltr]">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                      <span className="mr-2">{act.number}</span>
                      {act.eyebrow}
                    </p>
                    <h3 className="mt-3 text-2xl font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-3xl">
                      {act.title}
                    </h3>
                    <p className="mt-3 leading-relaxed text-[var(--foreground-body)]">
                      {act.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
