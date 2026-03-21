"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LandingPageContent } from "@/types/sanitySiteContent";

const cEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: cEase },
  },
};

const defaultTestimonials = [
  {
    quote:
      "We ducked into a ramen shop down a Kyoto backstreet. No English sign, six seats, steam everywhere. Best bowl of our lives.",
    author: "Sarah Chen",
    location: "San Francisco",
  },
  {
    quote:
      "Five trips to Japan and Koku still found places I'd never heard of. A cedar forest shrine at dawn, completely alone.",
    author: "Marcus Johnson",
    location: "London",
  },
  {
    quote:
      "The itinerary didn't feel algorithmic. It felt like someone who actually lives there planned it for us.",
    author: "Yuki Tanaka",
    location: "Vancouver",
  },
  {
    quote:
      "Our taxi driver in Takayama saw the itinerary on my phone and nodded approvingly. That told me everything.",
    author: "David Park",
    location: "Seoul",
  },
  {
    quote:
      "I thought two weeks was too long. By day ten I was already sad it was ending. Every single day had a moment.",
    author: "Emma Lindqvist",
    location: "Stockholm",
  },
  {
    quote:
      "Koku suggested a tofu restaurant in Arashiyama that wasn't on any blog I'd read. Seven courses, all soy. Transcendent.",
    author: "James O'Brien",
    location: "Dublin",
  },
];

type TestimonialData = {
  quote: string;
  author: string;
  location: string;
};

type TestimonialsCProps = {
  content?: LandingPageContent;
};

export function TestimonialsC({ content }: TestimonialsCProps) {
  const prefersReducedMotion = useReducedMotion();

  const testimonials: TestimonialData[] = content?.testimonials?.length
    ? content.testimonials.map((t) => ({
        quote: t.quote,
        author: t.authorName,
        location: t.authorLocation,
      }))
    : defaultTestimonials;

  const [featured, ...rest] = testimonials;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    updateScrollState();
  }, [updateScrollState]);

  const scroll = useCallback((dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }, []);

  if (!featured) return null;

  return (
    <section
      aria-label="Testimonials"
      data-section-dark
      className="bg-[var(--background)]"
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="py-24 sm:py-32 lg:py-48">
          {/* Featured quote: large, left-aligned in 8 cols */}
          <div className="lg:grid lg:grid-cols-12 lg:gap-4">
            <motion.div
              initial={prefersReducedMotion ? undefined : "hidden"}
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
              className="lg:col-span-8"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                What travelers say
              </p>

              <blockquote className="mt-8 lg:mt-12">
                <p
                  className="leading-[1.2] text-white"
                  style={{
                    fontFamily:
                      "var(--font-plus-jakarta), system-ui, sans-serif",
                    fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                  }}
                >
                  &ldquo;{featured.quote}&rdquo;
                </p>
              </blockquote>

              <div className="mt-8">
                <p className="text-sm font-bold text-white">
                  {featured.author}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {featured.location}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Remaining quotes: horizontal scroll row */}
          {rest.length > 0 && (
            <div className="mt-16 lg:mt-24">
              <div
                ref={scrollRef}
                onScroll={updateScrollState}
                className="flex snap-x snap-mandatory gap-px overflow-x-auto overscroll-contain scrollbar-hide"
              >
                {rest.map((t, i) => (
                  <motion.div
                    key={i}
                    initial={prefersReducedMotion ? undefined : { opacity: 0, x: 20 }}
                    whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-30px" }}
                    transition={{ duration: 0.4, delay: i * 0.08, ease: cEase }}
                    className="w-[min(320px,80vw)] shrink-0 snap-start border border-white/10 p-6 lg:p-8"
                  >
                    <blockquote>
                      <p className="text-sm leading-relaxed text-white/70">
                        &ldquo;{t.quote}&rdquo;
                      </p>
                    </blockquote>
                    <div className="mt-4">
                      <p className="text-xs font-bold text-white/90">
                        {t.author}
                      </p>
                      <p className="mt-0.5 text-[10px] text-white/40">
                        {t.location}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Scroll arrows */}
              <div className="mt-8 flex items-center gap-3">
                <button
                  aria-label="Scroll left"
                  onClick={() => scroll("left")}
                  className={`flex h-10 w-10 items-center justify-center border border-white/20 text-white/60 transition-opacity hover:text-white ${
                    canScrollLeft ? "opacity-100" : "pointer-events-none opacity-30"
                  }`}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  aria-label="Scroll right"
                  onClick={() => scroll("right")}
                  className={`flex h-10 w-10 items-center justify-center border border-white/20 text-white/60 transition-opacity hover:text-white ${
                    canScrollRight ? "opacity-100" : "pointer-events-none opacity-30"
                  }`}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="border-b border-white/10" />
    </section>
  );
}
