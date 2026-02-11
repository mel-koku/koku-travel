"use client";

import Image from "next/image";
import { SplitText } from "@/components/ui/SplitText";
import { staggerWord } from "@/lib/motion";
import type { LandingPageContent } from "@/types/sanitySiteContent";

const defaultTestimonials = [
  {
    quote:
      "We ducked into a ramen shop down a Kyoto backstreet — no English sign, six seats, steam everywhere. Best bowl of our lives.",
    author: "Sarah Chen",
    location: "San Francisco",
    image:
      "https://images.unsplash.com/photo-1554797589-7241bb691973?w=1920&q=80",
    alt: "Narrow Kyoto backstreet at night with warm lantern light",
  },
  {
    quote:
      "Five trips to Japan and Koku still found places I'd never heard of. A cedar forest shrine at dawn, completely alone.",
    author: "Marcus Johnson",
    location: "London",
    image:
      "https://images.unsplash.com/photo-1440186347098-386b7459ad6b?w=1920&q=80",
    alt: "Misty cedar forest with ancient stone path",
  },
  {
    quote:
      "The itinerary didn't feel algorithmic — it felt like someone who actually lives there planned it for us.",
    author: "Yuki Tanaka",
    location: "Vancouver",
    image:
      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1920&q=80",
    alt: "Quiet Japanese alleyway with traditional architecture",
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
  if (!featured) return null;

  return (
    <section>
      {/* Featured testimonial — full-bleed hero moment */}
      <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden">
        <Image
          src={featured.image}
          alt={featured.alt}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-charcoal/60" />

        <div className="relative z-10 max-w-3xl px-6 pb-12 text-center sm:px-12">
          <span className="mb-4 block select-none font-serif italic text-[6rem] leading-none text-white/10">
            &ldquo;
          </span>

          <blockquote className="-mt-16">
            <SplitText
              as="p"
              className="font-serif italic text-2xl leading-relaxed text-white sm:text-3xl lg:text-4xl"
              splitBy="word"
              animation="fadeUp"
              staggerDelay={staggerWord}
              delay={0.1}
            >
              {featured.quote}
            </SplitText>
          </blockquote>

          <div className="mt-8">
            <p className="text-sm font-medium text-white">
              {featured.author}
            </p>
            <p className="mt-0.5 text-xs text-white/50">
              {featured.location}
            </p>
          </div>
        </div>
      </div>

      {/* Remaining testimonials — compact card row */}
      {rest.length > 0 && (
        <div className="flex gap-6 overflow-x-auto overscroll-contain px-6 py-12">
          {rest.map((testimonial, i) => (
            <div
              key={i}
              className="min-w-[280px] flex-1 rounded-xl border border-border/50 bg-surface p-6"
            >
              <blockquote>
                <p className="font-serif italic text-base leading-relaxed text-foreground-secondary">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
              </blockquote>
              <div className="mt-4">
                <p className="text-xs font-medium text-stone">
                  {testimonial.author}
                </p>
                <p className="mt-0.5 text-xs text-stone/60">
                  {testimonial.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
