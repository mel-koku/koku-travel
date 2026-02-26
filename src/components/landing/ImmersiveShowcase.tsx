"use client";

import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { easeReveal, durationFast, durationBase } from "@/lib/motion";
import type { LandingPageContent } from "@/types/sanitySiteContent";

const defaultActs = [
  {
    number: "01",
    eyebrow: "DISCOVER",
    title: "The places locals keep to themselves",
    description:
      "Found the same way you'd find them if you lived here — word of mouth, wandering, and knowing where to look.",
    image:
      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1920&q=80",
    alt: "Traditional Japanese alley",
  },
  {
    number: "02",
    eyebrow: "PLAN",
    title: "Build your days, down to the hour",
    description:
      "Planning should feel like anticipation, not homework. Drag days around. Adjust the pace. See travel times between every stop.",
    image:
      "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4?w=1920&q=80",
    alt: "Peaceful Japanese garden",
  },
  {
    number: "03",
    eyebrow: "GO",
    title: "Your itinerary. Pocket-ready.",
    description:
      "Check it on the Shinkansen, share it with friends. Your plan goes where you go.",
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

export function ImmersiveShowcase({ content }: ImmersiveShowcaseProps) {
  const prefersReducedMotion = useReducedMotion();
  const acts = resolveActs(content);

  if (prefersReducedMotion) {
    return <ImmersiveShowcaseMobile acts={acts} />;
  }

  return (
    <>
      {/* Scroll-pinned desktop version */}
      <div className="hidden lg:block">
        <ImmersiveShowcaseDesktop acts={acts} />
      </div>
      {/* Simple stacked mobile version */}
      <div className="lg:hidden">
        <ImmersiveShowcaseMobile acts={acts} />
      </div>
    </>
  );
}

function ImmersiveShowcaseDesktop({ acts }: { acts: ActData[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sectionInView, setSectionInView] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Detect when the section enters the viewport (fires once)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setSectionInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={containerRef} className="relative h-[220vh] shrink-0 bg-background">
      <div className="sticky top-0 h-[100dvh] w-full overflow-hidden bg-background">
        {acts.map((act, index) => (
          <Act
            key={act.number}
            act={act}
            index={index}
            scrollYProgress={scrollYProgress}
            sectionInView={sectionInView}
          />
        ))}
      </div>
    </section>
  );
}

function Act({
  act,
  index,
  scrollYProgress,
  sectionInView,
}: {
  act: ActData;
  index: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  sectionInView: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const start = index / 3;
  const end = (index + 1) / 3;

  // Opacity ranges — sharper snap transitions (3% window)
  const opacityFirstIn = [0, end - 0.03, end];
  const opacityFirstOut = [1, 1, 0];
  const opacityMidIn = [Math.max(0, start - 0.015), start + 0.015, end - 0.03, end];
  const opacityMidOut = [0, 1, 1, 0];
  const opacityLastIn = [start - 0.015, start + 0.015, 1];
  const opacityLastOut = [0, 1, 1];

  const opacityFirst = useTransform(scrollYProgress, opacityFirstIn, opacityFirstOut);
  const opacityMid = useTransform(scrollYProgress, opacityMidIn, opacityMidOut);
  const opacityLast = useTransform(scrollYProgress, opacityLastIn, opacityLastOut);

  const adjustedOpacity = index === 0 ? opacityFirst : index === 2 ? opacityLast : opacityMid;

  // Sync opacity via ref — bypasses framer-motion v12's WAAPI renderer
  // which overrides style.opacity on motion.div elements
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.opacity = String(adjustedOpacity.get());
    const unsub = adjustedOpacity.on("change", (v) => {
      if (containerRef.current) containerRef.current.style.opacity = String(v);
    });
    return () => unsub();
  }, [adjustedOpacity]);

  // Track activation — triggers text reveal animations once
  // Requires section to be in viewport AND act opacity above threshold
  useEffect(() => {
    if (isActive || !sectionInView) return;
    // Act 0 activates immediately when section enters viewport
    if (index === 0) {
      setIsActive(true);
      return;
    }
    const unsub = adjustedOpacity.on("change", (v) => {
      if (v > 0.3) setIsActive(true);
    });
    return () => unsub();
  }, [isActive, sectionInView, index, adjustedOpacity]);

  // Image clip-path reveal from left
  const clipX = useTransform(
    scrollYProgress,
    [Math.max(0, start - 0.02), start + 0.1],
    [100, 0]
  );
  const clipXZero = useTransform(scrollYProgress, [0, 1], [0, 0]);
  const actualClipX = index === 0 ? clipXZero : clipX;

  // Derive clip-path string from the numeric clipX value
  const clipPathStyle = useTransform(actualClipX, (v) => `inset(0 ${v}% 0 0)`);

  const isFullWidth = index === 2;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center"
      style={{ opacity: 0 }}
    >

      {isFullWidth ? (
        /* Act 3: Full-width image with text overlay */
        <div className="relative h-full w-full bg-background">
          <motion.div
            className="absolute inset-0"
            style={{ clipPath: clipPathStyle }}
          >
            <Image
              src={act.image}
              alt={act.alt}
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-charcoal/60" />
          </motion.div>
          <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-6">
            <div className="max-w-lg">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ duration: durationFast, ease: easeReveal }}
                className="eyebrow-editorial text-brand-primary"
              >
                {act.eyebrow}
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                transition={{ duration: durationBase, ease: easeReveal, delay: 0.1 }}
                className="mt-4 font-serif italic text-2xl tracking-heading text-white sm:text-3xl lg:text-4xl"
              >
                {act.title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ duration: durationFast, ease: easeReveal, delay: 0.4 }}
                className="mt-6 text-base leading-relaxed text-white/80"
              >
                {act.description}
              </motion.p>
            </div>
          </div>
        </div>
      ) : (
        /* Acts 1–2: Split layout */
        <div
          className={`mx-auto grid h-full max-w-7xl items-center gap-6 lg:gap-16 px-6 ${
            index === 0
              ? "lg:grid-cols-[6fr_4fr]"
              : "lg:grid-cols-[4fr_6fr]"
          }`}
        >
          {index === 1 && (
            <div className="max-w-md lg:order-1">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ duration: durationFast, ease: easeReveal }}
                className="eyebrow-editorial text-brand-primary"
              >
                {act.eyebrow}
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                transition={{ duration: durationBase, ease: easeReveal, delay: 0.1 }}
                className="mt-4 font-serif italic text-2xl tracking-heading text-foreground sm:text-3xl"
              >
                {act.title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ duration: durationFast, ease: easeReveal, delay: 0.4 }}
                className="mt-6 text-base leading-relaxed text-foreground-secondary"
              >
                {act.description}
              </motion.p>
            </div>
          )}

          <motion.div
            className={`relative aspect-[4/3] overflow-hidden rounded-xl ${
              index === 1 ? "lg:order-2" : ""
            }`}
            style={{ clipPath: clipPathStyle }}
          >
            <Image
              src={act.image}
              alt={act.alt}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 60vw, 100vw"
              {...(index === 0 ? { loading: "eager" as const } : {})}
            />
          </motion.div>

          {index === 0 && (
            <div className="max-w-md">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ duration: durationFast, ease: easeReveal }}
                className="eyebrow-editorial text-brand-primary"
              >
                {act.eyebrow}
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                transition={{ duration: durationBase, ease: easeReveal, delay: 0.1 }}
                className="mt-4 font-serif italic text-2xl tracking-heading text-foreground sm:text-3xl"
              >
                {act.title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ duration: durationFast, ease: easeReveal, delay: 0.4 }}
                className="mt-6 text-base leading-relaxed text-foreground-secondary"
              >
                {act.description}
              </motion.p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ImmersiveShowcaseMobile({ acts }: { acts: ActData[] }) {
  return (
    <section className="bg-background py-12 sm:py-20 lg:py-28">
      {acts.map((act, i) => (
        <div key={act.number} className={`px-6 ${i > 0 ? "mt-12 sm:mt-16" : ""}`}>
          <div className="mx-auto max-w-3xl">
            <ScrollReveal delay={0.1}>
              <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
                <Image
                  src={act.image}
                  alt={act.alt}
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 768px, 100vw"
                  {...(i === 0 ? { loading: "eager" as const } : {})}
                />
              </div>
            </ScrollReveal>

            <div className="mt-5 sm:mt-8">
              <ScrollReveal delay={0.15}>
                <p className="eyebrow-editorial text-brand-primary">
                  {act.eyebrow}
                </p>
              </ScrollReveal>
              <ScrollReveal delay={0.2}>
                <h2 className="mt-3 font-serif italic text-xl tracking-heading text-foreground sm:mt-4 sm:text-2xl">
                  {act.title}
                </h2>
              </ScrollReveal>
              <ScrollReveal delay={0.3}>
                <p className="mt-3 text-base leading-relaxed text-foreground-secondary sm:mt-4">
                  {act.description}
                </p>
              </ScrollReveal>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
