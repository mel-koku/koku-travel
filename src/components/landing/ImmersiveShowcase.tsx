"use client";

import Image from "next/image";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { LandingPageContent } from "@/types/sanitySiteContent";

const defaultActs = [
  {
    number: "01",
    eyebrow: "DISCOVER",
    title: "Places worth knowing by name",
    description:
      "Found the same way you\u2019d find them if you lived here: word of mouth, wandering, and years on the ground.",
    image:
      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1920&q=80",
    alt: "Traditional Japanese alley",
  },
  {
    number: "02",
    eyebrow: "PLAN",
    title: "Build your days, down to the hour",
    description:
      "Tell us your pace and vibe. We handle the routing, timing, and the gaps you didn't know to fill.",
    image:
      "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4?w=1920&q=80",
    alt: "Peaceful Japanese garden",
  },
  {
    number: "03",
    eyebrow: "GO",
    title: "Your itinerary. Pocket-ready.",
    description:
      "Check it on the Shinkansen, share it with a link. Your plan goes where you go.",
    image:
      "https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?w=1920&q=80",
    alt: "Japanese train station",
  },
];

type ImmersiveShowcaseProps = {
  content?: LandingPageContent;
};

type ActData = {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  alt: string;
};

function resolveActs(content?: LandingPageContent): ActData[] {
  if (content?.showcaseActs?.length === 3) {
    return content.showcaseActs.map((act, i) => ({
      number: act.number,
      eyebrow: act.eyebrow,
      title: act.title,
      description: act.description,
      image: act.image?.url ?? defaultActs[i]?.image ?? defaultActs[0]!.image,
      alt: act.alt,
    }));
  }
  return [...defaultActs];
}

export function ImmersiveShowcase({ content }: ImmersiveShowcaseProps) {
  const acts = resolveActs(content);

  return (
    <section aria-label="Immersive showcase" className="bg-background py-12 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 space-y-16 sm:space-y-20 lg:space-y-24">
        {acts.map((act, i) => {
          const imageLeft = i % 2 === 0;
          const isLast = i === acts.length - 1;

          return (
            <ScrollReveal key={act.number} delay={0.05}>
              {isLast ? (
                /* Last act: wide cinematic image with text overlay */
                <div className="relative aspect-[16/7] overflow-hidden rounded-xl">
                  <Image
                    src={act.image}
                    alt={act.alt}
                    fill
                    className="object-cover"
                    sizes="100vw"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-charcoal/55" />
                  <div className="absolute inset-0 flex items-center px-10 lg:px-16">
                    <div className="max-w-lg">
                      <p className="eyebrow-editorial text-brand-primary">{act.eyebrow}</p>
                      <h2 className="mt-4 font-serif text-2xl tracking-heading text-white sm:text-3xl lg:text-4xl">
                        {act.title}
                      </h2>
                      <p className="mt-5 text-base leading-relaxed text-white/80">
                        {act.description}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Acts 1–2: split layout, alternating image side */
                <div
                  className={`grid items-center gap-10 lg:gap-16 ${
                    imageLeft ? "lg:grid-cols-[5fr_4fr]" : "lg:grid-cols-[4fr_5fr]"
                  }`}
                >
                  <div className={`relative aspect-[4/3] overflow-hidden rounded-xl ${!imageLeft ? "lg:order-2" : ""}`}>
                    <Image
                      src={act.image}
                      alt={act.alt}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 55vw, 100vw"
                      loading={i === 0 ? "eager" : "lazy"}
                    />
                  </div>
                  <div className={`max-w-md ${!imageLeft ? "lg:order-1" : ""}`}>
                    <p className="eyebrow-editorial text-brand-primary">{act.eyebrow}</p>
                    <h2 className="mt-4 font-serif text-2xl tracking-heading text-foreground sm:text-3xl">
                      {act.title}
                    </h2>
                    <p className="mt-5 text-base leading-relaxed text-foreground-secondary">
                      {act.description}
                    </p>
                  </div>
                </div>
              )}
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}
