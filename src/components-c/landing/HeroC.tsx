"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { urlFor } from "@/sanity/image";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type HeroCProps = {
  locationCount: number;
  content?: LandingPageContent;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1920&q=80";

const cEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

export function HeroC({ locationCount, content }: HeroCProps) {
  const noMotion = !!useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Staggered parallax speeds — each layer moves at a different rate
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const headlineY = useTransform(scrollYProgress, [0, 1], ["0%", "-25%"]);
  const descY = useTransform(scrollYProgress, [0, 1], ["0%", "-40%"]);
  const sidebarY = useTransform(scrollYProgress, [0, 1], ["0%", "-8%"]);
  const dotGridY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const scrollIndicatorOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  const headline =
    content?.heroHeadline ?? "Travel Japan like the people who live here";
  const description = (
    content?.heroDescription ??
    "{locationCount}+ places we'd actually send our friends to. Days planned around how you really travel."
  ).replace("{locationCount}", locationCount.toLocaleString());

  const heroImage = content?.heroImage;
  const imageSrc = heroImage
    ? urlFor(heroImage).width(1920).quality(85).url()
    : FALLBACK_IMAGE;
  const objectPosition = heroImage?.hotspot
    ? `${heroImage.hotspot.x * 100}% ${heroImage.hotspot.y * 100}%`
    : "center";

  return (
    <section
      ref={sectionRef}
      aria-label="Hero"
      className="relative h-[100dvh] overflow-hidden bg-[var(--background)]"
    >
      {/* ── Left sidebar: vertical labels ── */}
      <motion.div
        initial={noMotion ? undefined : { opacity: 0 }}
        animate={noMotion ? undefined : { opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6, ease: cEase }}
        style={noMotion ? undefined : { y: sidebarY }}
        className="absolute bottom-0 left-0 top-0 z-20 hidden w-12 flex-col items-center justify-between py-6 lg:flex lg:w-14"
      >
        <div />
        <p
          className="text-[9px] font-bold uppercase tracking-[0.3em] text-[var(--muted-foreground)]"
          style={{ writingMode: "vertical-rl" }}
        >
          Koku Travel
        </p>
        <p
          className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]"
          style={{ writingMode: "vertical-rl" }}
        >
          &copy; {new Date().getFullYear()}
        </p>
      </motion.div>

      {/* ── Dot grid ── */}
      <motion.div
        initial={noMotion ? undefined : { opacity: 0 }}
        animate={noMotion ? undefined : { opacity: 0.06 }}
        transition={{ duration: 1, delay: 0.8, ease: cEase }}
        style={noMotion ? undefined : { y: dotGridY }}
        className="absolute left-14 top-[25%] z-0 hidden lg:block"
      >
        <svg
          width="200"
          height="280"
          viewBox="0 0 200 280"
          fill="currentColor"
          className="text-[var(--foreground)]"
        >
          {Array.from({ length: 20 }).map((_, r) =>
            Array.from({ length: 14 }).map((_, c) => (
              <circle
                key={`${r}-${c}`}
                cx={5 + c * 14}
                cy={5 + r * 14}
                r="1.5"
              />
            )),
          )}
        </svg>
      </motion.div>

      {/* ── Hero image: parallax moves DOWN (slower than scroll) ── */}
      <motion.div
        initial={noMotion ? undefined : { opacity: 0, scale: 1.06 }}
        animate={noMotion ? undefined : { opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.1, ease: cEase }}
        className="absolute z-10"
        style={{ top: "5%", right: "8%", width: "58%", height: "78%", y: noMotion ? undefined : imageY }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt="Japan travel scene"
          className="h-full w-full object-cover"
          style={{ objectPosition }}
        />
        <div className="absolute inset-y-0 left-0 w-[3px] bg-[var(--primary)]" />
      </motion.div>

      {/* ── Headline: parallax moves UP (faster than scroll) ── */}
      <motion.div
        style={noMotion ? undefined : { y: headlineY }}
        className="absolute bottom-[14%] left-6 z-20 max-w-[45%] lg:bottom-[16%] lg:left-[5%] max-lg:max-w-[60%]"
      >
        <h1
          style={{
            fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
            fontSize: "clamp(2rem, 4vw, 4.5rem)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 0.95,
            color: "var(--foreground)",
          }}
        >
          {headline.split(" ").map((word, i) => (
            <motion.span
              key={i}
              initial={noMotion ? undefined : { opacity: 0, y: 30 }}
              animate={noMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.3 + i * 0.06,
                ease: cEase,
              }}
              className="mr-[0.25em] inline-block"
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={noMotion ? undefined : { opacity: 0, y: 12 }}
          animate={noMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7, ease: cEase }}
          style={noMotion ? undefined : { y: descY }}
          className="mt-5 max-w-[320px] text-sm leading-[1.7] text-[var(--muted-foreground)] lg:mt-6 lg:text-[15px]"
        >
          {description}
        </motion.p>

        <motion.div
          initial={noMotion ? undefined : { opacity: 0, y: 12 }}
          animate={noMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.85, ease: cEase }}
          style={noMotion ? undefined : { y: descY }}
          className="mt-5 flex items-center gap-3 lg:mt-6"
        >
          <Link
            href="/c/trip-builder"
            className="inline-flex h-11 items-center justify-center bg-[var(--primary)] px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-opacity duration-200 hover:opacity-90 active:scale-[0.98]"
          >
            Build My Trip
          </Link>
          <Link
            href="/c/places"
            className="inline-flex h-11 items-center justify-center border border-[var(--foreground)] px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--foreground)] transition-colors duration-200 hover:bg-[var(--foreground)] hover:text-[var(--background)]"
          >
            Browse Places
          </Link>
        </motion.div>
      </motion.div>

      {/* ── Scroll indicator: fades out on scroll + bouncing arrow ── */}
      <motion.div
        initial={noMotion ? undefined : { opacity: 0 }}
        animate={noMotion ? undefined : { opacity: 1 }}
        transition={{ duration: 0.5, delay: 1, ease: cEase }}
        style={noMotion ? undefined : { opacity: scrollIndicatorOpacity }}
        className="absolute bottom-5 left-6 z-20 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)] lg:bottom-8 lg:left-[5%]"
      >
        <span>Scroll to explore</span>
        <motion.svg
          animate={noMotion ? undefined : { y: [0, 4, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12l7 7 7-7" />
        </motion.svg>
      </motion.div>

      {/* ── Bottom hairline ── */}
      <div className="absolute inset-x-0 bottom-0 z-20 border-b border-[var(--border)]" />
    </section>
  );
}
