"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  BookOpen,
  Camera,
  Gamepad2,
  Leaf,
  Mountain,
  Smile,
  Sparkles,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";

import { VibeCardB } from "./VibeCardB";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { VIBES, MAX_VIBE_SELECTION, type VibeId } from "@/data/vibes";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

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
  Leaf: Leaf,
  Gamepad2: Gamepad2,
  Smile: Smile,
  BookOpen: BookOpen,
};

const VIBE_IMAGES: Record<VibeId, string> = {
  temples_tradition: "/images/regions/kansai-hero.jpg",
  foodie_paradise: "/images/regions/kyushu-hero.jpg",
  nature_adventure: "/images/regions/hokkaido-hero.jpg",
  zen_wellness: "/images/regions/chubu-hero.jpg",
  neon_nightlife: "/images/regions/kanto-hero.jpg",
  pop_culture: "/images/regions/kanto-hero.jpg",
  local_secrets: "/images/regions/shikoku-hero.jpg",
  family_fun: "/images/regions/okinawa-hero.jpg",
  history_buff: "/images/regions/chugoku-hero.jpg",
  in_season: "",
};

const TRIP_BUILDER_VIBES = VIBES.filter((v) => v.id !== "in_season");

export type VibeStepBProps = {
  onValidityChange?: (isValid: boolean) => void;
  sanityConfig?: TripBuilderConfig;
};

export function VibeStepB({ onValidityChange, sanityConfig }: VibeStepBProps) {
  const { data, setData } = useTripBuilder();

  const sanityVibes = sanityConfig?.vibes;
  const sanityVibeMap = useMemo(() => {
    if (!sanityVibes?.length) return null;
    const map = new Map<string, (typeof sanityVibes)[number]>();
    for (const v of sanityVibes) {
      map.set(v.vibeId, v);
    }
    return map;
  }, [sanityVibes]);

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
    [setData],
  );

  return (
    <div className="flex flex-1 flex-col bg-[var(--background)]">
      {/* Header */}
      <div className="px-4 pt-28 text-center sm:px-6 lg:pt-32">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
          Step 03
        </p>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: bEase, delay: 0.1 }}
          className="mt-3 text-3xl font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-4xl"
        >
          {sanityConfig?.vibeStepHeading ?? "What moves you?"}
        </motion.h2>

        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {sanityConfig?.vibeStepDescription ??
            "Choose up to 3. These shape the places we suggest."}
        </p>

        <div aria-live="polite">
          <p className="mt-2 text-sm font-medium text-[var(--muted-foreground)]">
            {selectedVibes.length} / {MAX_VIBE_SELECTION} selected
          </p>
        </div>
      </div>

      {/* Card grid — 2 cols on desktop, 1 col on mobile */}
      <div className="mx-auto mt-8 w-full max-w-3xl px-4 pb-24 sm:px-6 lg:mt-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRIP_BUILDER_VIBES.map((vibe, i) => {
            const isSelected = selectedVibes.includes(vibe.id);
            const isDisabled = isMaxSelected && !isSelected;
            const sanityVibe = sanityVibeMap?.get(vibe.id);
            const Icon =
              VIBE_ICONS[sanityVibe?.icon ?? vibe.icon] ?? Mountain;

            return (
              <VibeCardB
                key={vibe.id}
                name={sanityVibe?.name ?? vibe.name}
                description={
                  sanityVibe?.description ?? vibe.description
                }
                image={
                  sanityVibe?.image?.url ?? VIBE_IMAGES[vibe.id]
                }
                icon={Icon}
                index={i}
                isSelected={isSelected}
                isDisabled={isDisabled}
                onToggle={() => toggleVibe(vibe.id)}
              />
            );
          })}
        </div>
      </div>

      {/* Warning when max reached */}
      {isMaxSelected && (
        <p className="pb-8 text-center text-sm text-[var(--warning)] lg:pb-4">
          {(
            sanityConfig?.vibeStepMaxWarning ??
            "That\u2019s all {max}. Tap one to swap it out."
          ).replace("{max}", String(MAX_VIBE_SELECTION))}
        </p>
      )}
    </div>
  );
}
