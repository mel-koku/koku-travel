"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Choose Your Cities",
    description: "Tokyo, Kyoto, Osaka, or somewhere off the beaten path. Pick the places that call to you.",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
    alt: "Tokyo cityscape at night",
  },
  {
    number: "02",
    title: "Share Your Interests",
    description: "Temples and shrines? Street food adventures? Hidden nature spots? We'll match your vibe.",
    image: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80",
    alt: "Traditional Japanese street",
  },
  {
    number: "03",
    title: "Get Your Itinerary",
    description: "A day-by-day plan filled with spots our local guides personally recommend.",
    image: "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&q=80",
    alt: "Cherry blossoms in Japan",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-neutral-surface py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-20 max-w-2xl"
        >
          <p className="text-sm font-medium uppercase tracking-widest text-earthy-sage">
            How It Works
          </p>
          <h2 className="mt-4 font-serif text-4xl font-medium text-earthy-charcoal sm:text-5xl">
            Three steps to your
            <br />
            <span className="italic">perfect trip</span>
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="space-y-24 sm:space-y-32">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
              className={`flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-16 ${
                index % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              {/* Image */}
              <div className="flex-1">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                  <Image
                    src={step.image}
                    alt={step.alt}
                    fill
                    className="object-cover transition-transform duration-700 hover:scale-105"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 lg:max-w-md">
                <span className="font-serif text-6xl font-light text-earthy-stone/50">
                  {step.number}
                </span>
                <h3 className="mt-4 font-serif text-3xl font-medium text-earthy-charcoal">
                  {step.title}
                </h3>
                <p className="mt-4 text-lg leading-relaxed text-earthy-warmGray">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
