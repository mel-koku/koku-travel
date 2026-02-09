"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  Camera,
  Mountain,
  Sparkles,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import { SplitText } from "@/components/ui/SplitText";
import { VibeCard } from "./VibeCard";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { VIBES, MAX_VIBE_SELECTION, type VibeId } from "@/data/vibes";

// Custom Torii icon since Lucide doesn't have one
function ToriiIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 5h16" />
      <path d="M6 5v16" />
      <path d="M18 5v16" />
      <path d="M2 8h20" />
      <path d="M9 8v13" />
      <path d="M15 8v13" />
    </svg>
  );
}

const VIBE_ICONS: Record<string, LucideIcon | typeof ToriiIcon> = {
  Torii: ToriiIcon,
  Utensils: Utensils,
  Camera: Camera,
  Sparkles: Sparkles,
  Mountain: Mountain,
};

// Vibe images — using existing region hero images as placeholders
// These map each vibe to a thematically appropriate image
const VIBE_IMAGES: Record<VibeId, string> = {
  cultural_heritage: "/images/regions/kansai-hero.jpg",
  foodie_paradise: "/images/regions/kyushu-hero.jpg",
  hidden_gems: "/images/regions/shikoku-hero.jpg",
  neon_nightlife: "/images/regions/kanto-hero.jpg",
  nature_adventure: "/images/regions/hokkaido-hero.jpg",
};

export type VibeStepProps = {
  onValidityChange?: (isValid: boolean) => void;
};

export function VibeStep({ onValidityChange }: VibeStepProps) {
  const { data, setData } = useTripBuilder();

  const selectedVibes = useMemo(() => data.vibes ?? [], [data.vibes]);
  const isMaxSelected = selectedVibes.length >= MAX_VIBE_SELECTION;
  const hasSelectedVibes = selectedVibes.length > 0;

  useEffect(() => {
    onValidityChange?.(hasSelectedVibes);
  }, [hasSelectedVibes, onValidityChange]);

  const toggleVibe = useCallback(
    (vibeId: VibeId) => {
      setData((prev) => {
        const current = new Set<VibeId>(prev.vibes ?? []);
        if (current.has(vibeId)) {
          current.delete(vibeId);
        } else {
          if (current.size >= MAX_VIBE_SELECTION) return prev;
          current.add(vibeId);
        }
        return { ...prev, vibes: Array.from(current) };
      });
    },
    [setData]
  );

  return (
    <div className="flex flex-1 flex-col bg-charcoal">
      {/* Grain texture */}
      <div className="texture-grain pointer-events-none absolute inset-0" />

      {/* Typography — centered near top */}
      <div className="relative z-10 px-6 pt-28 text-center lg:pt-32">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-brand-primary">
          STEP 03
        </p>

        <SplitText
          as="h2"
          className="mt-3 justify-center font-serif text-4xl italic tracking-tight text-white sm:text-5xl"
          splitBy="word"
          trigger="load"
          animation="clipY"
          staggerDelay={0.06}
        >
          What moves you?
        </SplitText>

        <p className="mt-3 font-mono text-sm text-stone">
          {selectedVibes.length} / {MAX_VIBE_SELECTION} selected
        </p>
      </div>

      {/* Vibe cards — horizontal row on desktop, 2-col grid on mobile */}
      <div className="relative z-10 mx-auto mt-8 w-full max-w-5xl px-6 pb-32 lg:mt-10 lg:pb-8">
        {/* Desktop: centered horizontal row */}
        <div className="hidden justify-center gap-4 lg:flex">
          {VIBES.map((vibe) => {
            const isSelected = selectedVibes.includes(vibe.id);
            const isDisabled = isMaxSelected && !isSelected;
            const Icon = VIBE_ICONS[vibe.icon] ?? Mountain;

            return (
              <div key={vibe.id} className="w-[200px]">
                <VibeCard
                  name={vibe.name}
                  description={vibe.description}
                  image={VIBE_IMAGES[vibe.id]}
                  icon={Icon}
                  isSelected={isSelected}
                  isDisabled={isDisabled}
                  onToggle={() => toggleVibe(vibe.id)}
                />
              </div>
            );
          })}
        </div>

        {/* Mobile: 2-column grid, 5th card spans full width */}
        <div className="grid grid-cols-2 gap-3 lg:hidden">
          {VIBES.map((vibe, i) => {
            const isSelected = selectedVibes.includes(vibe.id);
            const isDisabled = isMaxSelected && !isSelected;
            const Icon = VIBE_ICONS[vibe.icon] ?? Mountain;
            const isLast = i === VIBES.length - 1;

            return (
              <div key={vibe.id} className={isLast ? "col-span-2 mx-auto max-w-[200px]" : ""}>
                <VibeCard
                  name={vibe.name}
                  description={vibe.description}
                  image={VIBE_IMAGES[vibe.id]}
                  icon={Icon}
                  isSelected={isSelected}
                  isDisabled={isDisabled}
                  onToggle={() => toggleVibe(vibe.id)}
                />
              </div>
            );
          })}
        </div>

        {/* Warning when max reached */}
        {isMaxSelected && (
          <p className="mt-6 text-center text-sm text-warning">
            Maximum {MAX_VIBE_SELECTION} vibes selected. Deselect one to choose another.
          </p>
        )}
      </div>
    </div>
  );
}
