"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";

type TextInterstitialProps = {
  text: string;
};

export function TextInterstitial({ text }: TextInterstitialProps) {
  return (
    <ScrollReveal distance={20} duration={0.7}>
      <div className="py-16 text-center">
        <p className="font-serif italic text-2xl text-foreground-secondary max-w-2xl mx-auto leading-relaxed">
          {text}
        </p>
      </div>
    </ScrollReveal>
  );
}
