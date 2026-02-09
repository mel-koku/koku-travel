"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";

import type { GuideSummary } from "@/types/guide";
import { SplitText } from "@/components/ui/SplitText";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useCursor } from "@/hooks/useCursor";

const GUIDE_TYPE_LABELS: Record<GuideSummary["guideType"], string> = {
  itinerary: "Itinerary",
  listicle: "Top Picks",
  deep_dive: "Deep Dive",
  seasonal: "Seasonal",
};

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

type GuideHeroSpreadProps = {
  guide: GuideSummary;
};

export function GuideHeroSpread({ guide }: GuideHeroSpreadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { setCursorState } = useCursor();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const imageScale = useTransform(scrollYProgress, [0, 1], [1.08, 1]);
  const imageY = useTransform(scrollYProgress, [0, 1], ["-3%", "3%"]);

  const imageSrc = guide.thumbnailImage || guide.featuredImage || FALLBACK_IMAGE;
  const typeLabel = GUIDE_TYPE_LABELS[guide.guideType];
  const location = guide.city || guide.region || "";
  const metaParts = [typeLabel, location, guide.readingTimeMinutes ? `${guide.readingTimeMinutes} min read` : ""].filter(Boolean);

  return (
    <Link
      href={`/guides/${guide.id}`}
      className="group block"
      onMouseEnter={() => setCursorState("read")}
      onMouseLeave={() => setCursorState("default")}
    >
      <div
        ref={containerRef}
        className="grid min-h-[70vh] lg:grid-cols-2"
      >
        {/* Image half */}
        <div className="relative min-h-[40vh] overflow-hidden lg:min-h-[70vh]">
          <motion.div
            className="absolute inset-0"
            style={
              prefersReducedMotion
                ? {}
                : { scale: imageScale, y: imageY }
            }
          >
            <Image
              src={imageSrc}
              alt={guide.title}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
            />
          </motion.div>
          {/* Edge gradient toward text */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-charcoal/40 lg:to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-charcoal/30" />
        </div>

        {/* Text half */}
        <div className="flex items-center bg-charcoal px-8 py-16 sm:px-12 lg:px-16 lg:py-24">
          <div className="max-w-lg">
            {/* Eyebrow */}
            <ScrollReveal distance={10} delay={0}>
              <p className="font-mono text-xs uppercase tracking-wide text-stone">
                {metaParts.join(" · ")}
              </p>
            </ScrollReveal>

            {/* Title */}
            <SplitText
              as="h2"
              className="mt-4 font-serif text-3xl leading-snug text-white/90 sm:text-4xl lg:text-5xl"
              splitBy="word"
              animation="clipY"
              staggerDelay={0.04}
              delay={0.15}
            >
              {guide.title}
            </SplitText>

            {/* Summary */}
            <ScrollReveal distance={15} delay={0.3}>
              <p className="mt-6 text-sm leading-relaxed text-foreground-secondary max-w-md">
                {guide.summary}
              </p>
            </ScrollReveal>

            {/* CTA */}
            <ScrollReveal distance={10} delay={0.5}>
              <span className="link-reveal mt-8 inline-block text-sm font-medium text-white">
                Read guide →
              </span>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </Link>
  );
}
