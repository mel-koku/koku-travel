"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const testimonials = [
  {
    quote: "We found a tiny ramen shop in a Kyoto backstreet that wasn't in any guidebook. Best meal of our entire trip.",
    author: "Sarah Chen",
    location: "San Francisco",
  },
  {
    quote: "Five trips to Japan and Koku still showed me places I'd never heard of. My friends thought I hired a private guide.",
    author: "Marcus Johnson",
    location: "London",
  },
];

export function TestimonialSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1528164344705-47542687000d?w=1920&q=80"
          alt="Arashiyama bamboo grove in Kyoto"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0" style={{ backgroundColor: "rgba(45, 42, 38, 0.75)" }} />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center sm:mb-16"
        >
          <p className="text-sm font-medium uppercase tracking-widest text-white/60">
            Traveler Stories
          </p>
          <h2 className="mt-4 font-serif text-2xl font-medium text-white sm:text-3xl">
            Don&apos;t just take
            <br />
            <span className="italic">our word for it</span>
          </h2>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2">
          {testimonials.map((testimonial, index) => (
            <motion.blockquote
              key={testimonial.author}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="p-8 sm:p-10"
            >
              <p className="font-serif text-lg leading-relaxed text-white sm:text-xl">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <footer className="mt-8">
                <p className="font-medium text-white">{testimonial.author}</p>
                <p className="text-sm text-white/60">{testimonial.location}</p>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
