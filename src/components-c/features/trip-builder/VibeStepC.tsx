"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  BookOpen,
  Camera,
  Gamepad2,
  Leaf,
  Mountain,
  Palette,
  Smile,
  Sparkles,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { VibeCardC } from "./VibeCardC";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { VIBES, MAX_VIBE_SELECTION, type VibeId } from "@/data/vibes";
import { cEase } from "@c/ui/motionC";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

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
  Palette: Palette,
};

const TRIP_BUILDER_VIBES = VIBES.filter((v) => v.id !== "in_season");

export type VibeStepCProps = {
  onValidityChange?: (isValid: boolean) => void;
  sanityConfig?: TripBuilderConfig;
};

export function VibeStepC({ onValidityChange, sanityConfig }: VibeStepCProps) {
  const prefersReducedMotion = useReducedMotion();
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
      <div className="mx-auto w-full max-w-4xl px-6 pt-20 pb-24 sm:pt-28 lg:px-10 lg:pt-32">
        {/* Header */}
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Step 03
        </p>

        <motion.h2
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: cEase, delay: 0.1 }}
          className="mt-4 text-2xl font-bold tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl"
          style={{ fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}
        >
          {sanityConfig?.vibeStepHeading ?? "What moves you?"}
        </motion.h2>

        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {sanityConfig?.vibeStepDescription ??
            "Pick what excites you. We'll find places that match."}
        </p>

        <div aria-live="polite">
          <p className="mt-2 text-sm font-bold text-[var(--muted-foreground)]">
            {selectedVibes.length} / {MAX_VIBE_SELECTION} selected
          </p>
        </div>

        {/* Tile grid */}
        <div className="mt-8 lg:mt-10">
        <div className="grid grid-cols-2 gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-5">
          {TRIP_BUILDER_VIBES.map((vibe, i) => {
            const isSelected = selectedVibes.includes(vibe.id);
            const isDisabled = isMaxSelected && !isSelected;
            const sanityVibe = sanityVibeMap?.get(vibe.id);
            const Icon =
              VIBE_ICONS[sanityVibe?.icon ?? vibe.icon] ?? Mountain;

            return (
              <VibeCardC
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
          <p className="mt-4 text-sm text-[var(--warning)]">
            {(
              sanityConfig?.vibeStepMaxWarning ??
              "All {max} picked. Tap one to replace it."
            ).replace("{max}", String(MAX_VIBE_SELECTION))}
          </p>
        )}
        </div>
      </div>
    </div>
  );
}
