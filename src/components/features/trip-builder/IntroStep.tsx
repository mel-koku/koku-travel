"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Calendar, MapPin, Compass, Sparkles } from "lucide-react";

type IntroStepProps = {
  onStart: () => void;
};

const FEATURES = [
  {
    icon: Calendar,
    title: "Set your dates",
    description: "Tell us when you're traveling",
  },
  {
    icon: MapPin,
    title: "Choose regions",
    description: "Select where you want to explore",
  },
  {
    icon: Compass,
    title: "Pick your style",
    description: "Share your travel preferences",
  },
  {
    icon: Sparkles,
    title: "Get your itinerary",
    description: "Receive a personalized plan",
  },
];

const REGION_IMAGES = [
  { src: "/images/regions/kansai-hero.jpg", alt: "Kansai region" },
  { src: "/images/regions/kanto-hero.jpg", alt: "Kanto region" },
  { src: "/images/regions/hokkaido-hero.jpg", alt: "Hokkaido region" },
  { src: "/images/regions/okinawa-hero.jpg", alt: "Okinawa region" },
];

export function IntroStep({ onStart }: IntroStepProps) {
  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-surface p-4 sm:p-6 lg:p-8">
      <div className="flex w-full max-w-6xl flex-col items-center gap-8 lg:flex-row lg:items-stretch lg:gap-12">
        {/* Content Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full rounded-2xl border border-border bg-background p-6 shadow-soft sm:p-8 lg:max-w-xl"
        >
          {/* Heading */}
          <h1 className="font-serif text-2xl font-medium text-charcoal sm:text-3xl">
            Plan Your Trip
          </h1>

          {/* Subtitle */}
          <p className="mt-2 text-lg text-stone">Wizard-Based Trip Builder</p>

          {/* Description */}
          <p className="mt-4 text-base leading-relaxed text-warm-gray">
            Create your perfect Japan itinerary in just a few steps. Our
            intelligent trip builder will guide you through the process and
            generate a personalized travel plan based on your preferences.
          </p>

          {/* Feature List */}
          <div className="mt-8 space-y-4">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.4,
                  delay: 0.2 + index * 0.1,
                  ease: "easeOut",
                }}
                className="flex items-start gap-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/10">
                  <feature.icon className="h-5 w-5 text-brand-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-charcoal">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-warm-gray">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.7 }}
            className="mt-8"
          >
            <button
              type="button"
              onClick={onStart}
              className="w-full rounded-full bg-brand-primary px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-primary/90 sm:w-auto"
            >
              Start Planning
            </button>
          </motion.div>
        </motion.div>

        {/* Image Grid - Desktop only */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="hidden flex-1 grid-cols-2 gap-4 lg:grid"
        >
          {REGION_IMAGES.map((image, index) => (
            <div
              key={image.src}
              className={`relative overflow-hidden rounded-xl ${
                index === 0 || index === 3 ? "aspect-[4/5]" : "aspect-[4/3]"
              }`}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                className="object-cover transition-transform duration-500 hover:scale-105"
                sizes="(min-width: 1024px) 20vw, 0"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
