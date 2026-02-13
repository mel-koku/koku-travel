"use client";

import { motion } from "framer-motion";
import { SplitText } from "@/components/ui/SplitText";
import { Magnetic } from "@/components/ui/Magnetic";
import { durationBase, magneticCTA } from "@/lib/motion";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type FinalCTAProps = {
  content?: LandingPageContent;
};

export function FinalCTA({ content }: FinalCTAProps) {
  return (
    <section
      className="relative overflow-hidden"
    >
      <div className="texture-grain pointer-events-none absolute inset-0 z-20" />
      {/* Solid brand-primary background */}
      <div className="absolute inset-0 bg-brand-primary" />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center px-6 py-24 sm:py-32 lg:py-40 text-center">
        <div className="max-w-2xl">
          <SplitText
            as="h2"
            className="justify-center font-serif italic text-2xl tracking-heading text-white sm:text-3xl lg:text-4xl"
            splitBy="char"
            animation="clipY"
            staggerDelay={0.02}
          >
            {content?.finalCtaHeading ?? "Your Japan is waiting"}
          </SplitText>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: durationBase, delay: 0.5 }}
            className="mx-auto mt-8 max-w-md text-base text-white/80"
          >
            {content?.finalCtaDescription ?? "Every trip starts with a single place. Find yours."}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: durationBase, delay: 0.7 }}
            className="mt-12 flex flex-col items-center"
          >
            <Magnetic strength={magneticCTA.strength} maxDisplacement={magneticCTA.maxDisplacement} threshold={magneticCTA.threshold}>
              <a
                href="/trip-builder"
                className="relative inline-flex h-14 items-center justify-center rounded-xl bg-white px-10 text-sm font-semibold uppercase tracking-wider text-brand-primary shadow-lg transition-all hover:bg-white/90 hover:shadow-xl active:scale-[0.98]"
              >
                <span className="relative">{content?.finalCtaPrimaryText ?? "Start Planning"}</span>
              </a>
            </Magnetic>
            <a
              href="/explore"
              className="link-reveal mt-6 py-3 text-sm font-medium uppercase tracking-wider text-white/60 transition-colors hover:text-white/90"
            >
              {content?.finalCtaSecondaryText ?? "Browse Locations"}
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: durationBase, delay: 1 }}
            className="mt-10 text-sm uppercase tracking-wide text-white/50"
          >
            {content?.finalCtaSubtext ?? "Free to use. No account required."}
          </motion.p>
        </div>
      </div>
    </section>
  );
}
