"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import { SplitText } from "@/components/ui/SplitText";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { staggerWord } from "@/lib/motion";
import type { LandingPageContent } from "@/types/sanitySiteContent";

const defaultTestimonials = [
  {
    quote:
      "We ducked into a ramen shop down a Kyoto backstreet. No English sign, six seats, steam everywhere. Best bowl of our lives.",
    author: "Sarah Chen",
    location: "San Francisco",
    image:
      "https://images.unsplash.com/photo-1554797589-7241bb691973?w=1920&q=80",
    alt: "Narrow Kyoto backstreet at night with warm lantern light",
  },
  {
    quote:
      "Five trips to Japan and Koku still surfaced places I'd overlooked. A cedar forest shrine at dawn, completely alone.",
    author: "Marcus Johnson",
    location: "London",
    image:
      "https://images.unsplash.com/photo-1440186347098-386b7459ad6b?w=1920&q=80",
    alt: "Misty cedar forest with ancient stone path",
  },
  {
    quote:
      "The itinerary didn't feel algorithmic. It felt like someone who actually lives there planned it for us.",
    author: "Yuki Tanaka",
    location: "Vancouver",
    image:
      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1920&q=80",
    alt: "Quiet Japanese alleyway with traditional architecture",
  },
  {
    quote:
      "Our taxi driver in Takayama saw the itinerary on my phone and nodded approvingly. That told me everything.",
    author: "David Park",
    location: "Seoul",
    image: "",
    alt: "",
  },
  {
    quote:
      "I thought two weeks was too long. By day ten I was already sad it was ending. Every single day had a moment.",
    author: "Emma Lindqvist",
    location: "Stockholm",
    image: "",
    alt: "",
  },
  {
    quote:
      "Koku suggested a tofu restaurant in Arashiyama we'd never have picked ourselves. Seven courses, all soy. Transcendent.",
    author: "James O'Brien",
    location: "Dublin",
    image: "",
    alt: "",
  },
  {
    quote:
      "We traveled with a toddler and the plan actually accounted for nap breaks and family-friendly stops. Lifesaver.",
    author: "Priya Sharma",
    location: "Melbourne",
    image: "",
    alt: "",
  },
  {
    quote:
      "The overnight ferry to Yakushima was the highlight we almost skipped. Woke up to that island emerging from mist.",
    author: "Lucas Moreau",
    location: "Paris",
    image: "",
    alt: "",
  },
  {
    quote:
      "I've used every trip planner out there. This is the first one that understood the difference between seeing Japan and feeling it.",
    author: "Aisha Williams",
    location: "New York",
    image: "",
    alt: "",
  },
  {
    quote:
      "Spent three hours in a Kanazawa market that wasn't even the 'main attraction' for the day. Bought pottery I'll keep forever.",
    author: "Henrik Bjørnstad",
    location: "Oslo",
    image: "",
    alt: "",
  },
  {
    quote:
      "My partner doesn't like planned trips. Five minutes into day one, she turned to me and said 'okay, this is different.'",
    author: "Tomás Rivera",
    location: "Mexico City",
    image: "",
    alt: "",
  },
];

type TestimonialData = {
  quote: string;
  author: string;
  location: string;
  image: string;
  alt: string;
};

type TestimonialTheaterProps = {
  content?: LandingPageContent;
};

export function TestimonialTheater({ content }: TestimonialTheaterProps) {
  const testimonials: TestimonialData[] = content?.testimonials?.length
    ? content.testimonials.map((t) => ({
        quote: t.quote,
        author: t.authorName,
        location: t.authorLocation,
        image: t.image?.url ?? defaultTestimonials[0]!.image,
        alt: t.alt,
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
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  }, []);

  if (!featured) return null;

  return (
    <section aria-label="Testimonials" className="bg-background">
      {/* Featured testimonial — full-bleed hero moment */}
      <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden">
        {featured.image ? (
          <Image
            src={featured.image}
            alt={featured.alt}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-charcoal" />
        )}
        <div className="absolute inset-0 bg-charcoal/60" />

        <div className="relative z-10 max-w-3xl px-6 py-12 sm:px-8 sm:py-20 lg:py-28">
          <span className="mb-4 block select-none font-serif text-[4rem] leading-none text-white/15 sm:text-[6rem]">
            &ldquo;
          </span>

          <blockquote className="-mt-12 sm:-mt-16">
            <SplitText
              as="p"
              className={cn(typography({ intent: "editorial-h2" }), "text-white")}
              splitBy="word"
              animation="fadeUp"
              staggerDelay={staggerWord}
              delay={0.1}
            >
              {featured.quote}
            </SplitText>
          </blockquote>

          <div className="mt-8">
            <p className={cn(typography({ intent: "utility-body" }), "text-sm font-medium text-white")}>
              {featured.author}
            </p>
            <p className={cn(typography({ intent: "utility-meta" }), "mt-0.5 text-white/70")}>
              {featured.location}
            </p>
          </div>
        </div>
      </div>

      {/* Remaining testimonials — horizontal scroll with arrows */}
      {rest.length > 0 && (
        <ScrollReveal delay={0.1}>
        <div className="py-12 sm:py-20 lg:py-28">
          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-contain px-6 scrollbar-hide sm:gap-5 sm:px-8 lg:px-12"
          >
            {rest.map((testimonial, i) => (
              <div
                key={i}
                className="w-[min(340px,85vw)] shrink-0 snap-start rounded-lg border border-border bg-white p-7 shadow-[var(--shadow-card)]"
              >
                <blockquote>
                  <p className={cn(typography({ intent: "editorial-quote" }), "text-base leading-relaxed")}>
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                </blockquote>
                <div className="mt-4">
                  <p className={cn(typography({ intent: "utility-meta" }), "font-medium text-foreground")}>
                    {testimonial.author}
                  </p>
                  <p className={cn(typography({ intent: "utility-meta" }), "mt-0.5")}>
                    {testimonial.location}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Arrow buttons below cards */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              aria-label="Scroll left"
              onClick={() => scroll("left")}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-foreground-secondary shadow-[var(--shadow-card)] transition-all hover:text-foreground",
                canScrollLeft ? "opacity-100" : "pointer-events-none opacity-30"
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              aria-label="Scroll right"
              onClick={() => scroll("right")}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-foreground-secondary shadow-[var(--shadow-card)] transition-all hover:text-foreground",
                canScrollRight ? "opacity-100" : "pointer-events-none opacity-30"
              )}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        </ScrollReveal>
      )}
    </section>
  );
}
