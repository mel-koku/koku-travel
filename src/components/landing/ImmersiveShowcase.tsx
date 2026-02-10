"use client";

import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { useRef, useEffect } from "react";
import { SplitText } from "@/components/ui/SplitText";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const acts = [
  {
    number: "01",
    eyebrow: "DISCOVER",
    title: "The places locals keep to themselves",
    description:
      "Every place in our collection was found the same way you'd find it if you lived here — word of mouth, wandering, and years of knowing where to look.",
    image:
      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1920&q=80",
    alt: "Traditional Japanese alley",
  },
  {
    number: "02",
    eyebrow: "PLAN",
    title: "Build your days, your way",
    description:
      "Planning should feel like anticipation, not homework. Rearrange your days, adjust the pace, see travel times between every stop.",
    image:
      "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4?w=1920&q=80",
    alt: "Peaceful Japanese garden",
  },
  {
    number: "03",
    eyebrow: "GO",
    title: "Your itinerary, everywhere",
    description:
      "Check it on the Shinkansen, share it with friends. Your plan goes where you go.",
    image:
      "https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?w=1920&q=80",
    alt: "Japanese train station",
  },
];

export function ImmersiveShowcase() {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <ImmersiveShowcaseMobile />;
  }

  return <ImmersiveShowcaseDesktop />;
}

function ImmersiveShowcaseDesktop() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <section ref={containerRef} className="relative h-[300vh] shrink-0 bg-background">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-charcoal">
        {acts.map((act, index) => (
          <Act
            key={act.number}
            act={act}
            index={index}
            scrollYProgress={scrollYProgress}
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
}: {
  act: (typeof acts)[number];
  index: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const start = index / 3;
  const end = (index + 1) / 3;

  // Opacity ranges — each act fades in/out with crossfade overlap
  const opacityFirstIn = [0, end - 0.08, end];
  const opacityFirstOut = [1, 1, 0];
  const opacityMidIn = [Math.max(0, start - 0.05), start + 0.05, end - 0.08, end];
  const opacityMidOut = [0, 1, 1, 0];
  const opacityLastIn = [start - 0.05, start + 0.05, 1];
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- motion values are stable refs
  }, []);

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
        <div className="relative h-full w-full bg-charcoal">
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
            <div className="max-w-lg text-white">
              <p className="text-sm font-medium uppercase tracking-ultra text-brand-primary">
                {act.eyebrow}
              </p>
              <h2 className="mt-4 font-serif italic text-2xl tracking-heading text-white sm:text-3xl lg:text-4xl">
                {act.title}
              </h2>
              <p className="mt-6 text-base leading-relaxed text-white/80">
                {act.description}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Acts 1–2: Split layout */
        <div
          className={`mx-auto grid h-full max-w-7xl items-center gap-16 px-6 ${
            index === 0
              ? "lg:grid-cols-[6fr_4fr]"
              : "lg:grid-cols-[4fr_6fr]"
          }`}
        >
          {index === 1 && (
            <div className="max-w-md lg:order-1">
              <p className="text-sm font-medium uppercase tracking-ultra text-brand-primary">
                {act.eyebrow}
              </p>
              <h2 className="mt-4 font-serif italic text-2xl tracking-heading text-foreground sm:text-3xl">
                {act.title}
              </h2>
              <p className="mt-6 text-base leading-relaxed text-foreground-secondary">
                {act.description}
              </p>
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
            />
          </motion.div>

          {index === 0 && (
            <div className="max-w-md">
              <p className="text-sm font-medium uppercase tracking-ultra text-brand-primary">
                {act.eyebrow}
              </p>
              <h2 className="mt-4 font-serif italic text-2xl tracking-heading text-foreground sm:text-3xl">
                {act.title}
              </h2>
              <p className="mt-6 text-base leading-relaxed text-foreground-secondary">
                {act.description}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ImmersiveShowcaseMobile() {
  return (
    <section className="bg-background">
      {acts.map((act) => (
        <div key={act.number} className="px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <ScrollReveal delay={0.1}>
              <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
                <Image
                  src={act.image}
                  alt={act.alt}
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
              </div>
            </ScrollReveal>

            <div className="mt-8">
              <ScrollReveal delay={0.15}>
                <p className="text-sm font-medium uppercase tracking-ultra text-brand-primary">
                  {act.eyebrow}
                </p>
              </ScrollReveal>
              <SplitText
                as="h2"
                className="mt-4 font-serif italic text-xl tracking-heading text-foreground sm:text-2xl"
                splitBy="word"
                animation="clipY"
                delay={0.2}
              >
                {act.title}
              </SplitText>
              <ScrollReveal delay={0.3}>
                <p className="mt-4 text-base leading-relaxed text-foreground-secondary">
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
