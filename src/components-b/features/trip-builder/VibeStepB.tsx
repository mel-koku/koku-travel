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
      <div className="px-4 pt-20 text-center sm:px-6 sm:pt-28 lg:pt-32">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
          Step 03
        </p>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: bEase, delay: 0.1 }}
          className="mt-3 text-2xl font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-3xl"
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

      {/* Compact tile grid — 5 cols desktop, 3 tablet, 2 mobile */}
      <div className="mx-auto mt-8 w-full max-w-4xl px-4 pb-24 sm:px-6 lg:mt-10">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
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
                icon={Icon}
                index={i}
                isSelected={isSelected}
                isDisabled={isDisabled}
                onToggle={() => toggleVibe(vibe.id)}
              />
            );
          })}
        </div>

        {/* Warning when max reached */}
        {isMaxSelected && (
          <p className="mt-4 text-center text-sm text-[var(--warning)]">
            {(
              sanityConfig?.vibeStepMaxWarning ??
              "All {max} picked. Tap one to replace it."
            ).replace("{max}", String(MAX_VIBE_SELECTION))}
          </p>
        )}
      </div>
    </div>
  );
}
