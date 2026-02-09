"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { staggerWord, easeCinematicCSS } from "@/lib/motion";
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
  const [hoveredId, setHoveredId] = useState<VibeId | null>(null);

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
          staggerDelay={staggerWord}
        >
          What moves you?
        </SplitText>

        <p className="mt-2 text-sm text-stone">
          Pick what excites you — we&apos;ll find places that match.
        </p>

        <p className="mt-2 font-mono text-sm text-stone">
          {selectedVibes.length} / {MAX_VIBE_SELECTION} selected
        </p>
      </div>

      {/* Desktop: Expanding columns */}
      <div className="relative z-10 mt-8 hidden flex-1 px-8 pb-8 lg:flex lg:mt-10 lg:px-12">
        <div className="flex w-full gap-[3px]">
          {VIBES.map((vibe, i) => {
            const isSelected = selectedVibes.includes(vibe.id);
            const isDisabled = isMaxSelected && !isSelected;
            const Icon = VIBE_ICONS[vibe.icon] ?? Mountain;
            const isHovered = hoveredId === vibe.id;

            // Dynamic flex: hovered expands to 2, siblings contract to 0.75, default is 1
            let flexValue = 1;
            if (hoveredId !== null) {
              flexValue = isHovered ? 2.0 : 0.75;
            }

            return (
              <div
                key={vibe.id}
                className="min-w-0 overflow-hidden rounded-xl"
                style={{
                  flex: flexValue,
                  transition:
                    `flex 0.7s ${easeCinematicCSS}`,
                }}
              >
                <VibeCard
                  name={vibe.name}
                  description={vibe.description}
                  image={VIBE_IMAGES[vibe.id]}
                  icon={Icon}
                  index={i}
                  isSelected={isSelected}
                  isDisabled={isDisabled}
                  isHovered={isHovered}
                  onToggle={() => toggleVibe(vibe.id)}
                  onHover={() => setHoveredId(vibe.id)}
                  onLeave={() => setHoveredId(null)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Horizontal scroll with snap */}
      <div className="relative z-10 mt-8 pb-32 lg:hidden">
        <div className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto px-6">
          {VIBES.map((vibe, i) => {
            const isSelected = selectedVibes.includes(vibe.id);
            const isDisabled = isMaxSelected && !isSelected;
            const Icon = VIBE_ICONS[vibe.icon] ?? Mountain;

            return (
              <div
                key={vibe.id}
                className="h-[55vh] w-[72vw] flex-shrink-0 snap-center overflow-hidden rounded-xl"
              >
                <VibeCard
                  name={vibe.name}
                  description={vibe.description}
                  image={VIBE_IMAGES[vibe.id]}
                  icon={Icon}
                  index={i}
                  isSelected={isSelected}
                  isDisabled={isDisabled}
                  isHovered={false}
                  onToggle={() => toggleVibe(vibe.id)}
                  onHover={() => {}}
                  onLeave={() => {}}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Warning when max reached */}
      {isMaxSelected && (
        <p className="relative z-10 pb-8 text-center text-sm text-warning lg:pb-4">
          You&apos;ve picked {MAX_VIBE_SELECTION} — swap one out to add another.
        </p>
      )}
    </div>
  );
}
