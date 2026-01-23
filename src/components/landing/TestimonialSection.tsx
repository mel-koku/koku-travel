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
          src="https://images.unsplash.com/photo-1578271887552-5ac3a72752bc?w=1920&q=80"
          alt="Mount Fuji and cherry blossoms"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-earthy-charcoal/80" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 sm:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <p className="text-sm font-medium uppercase tracking-widest text-white/60">
            Traveler Stories
          </p>
          <h2 className="mt-4 font-serif text-4xl font-medium text-white sm:text-5xl">
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
              className="rounded-2xl bg-white/5 p-8 backdrop-blur-sm sm:p-10"
            >
              <p className="font-serif text-xl leading-relaxed text-white sm:text-2xl">
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
