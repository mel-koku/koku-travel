"use client";

import { useCallback, useEffect, useMemo } from "react";

import { motion } from "framer-motion";
import { VibeCard } from "./VibeCard";
import { useTripBuilder } from "@/context/TripBuilderContext";
import { useAppState } from "@/state/AppState";
import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import { VIBES, MAX_VIBE_SELECTION, type VibeId } from "@/data/vibes";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";

const TRIP_BUILDER_VIBES = VIBES.filter((v) => v.id !== "in_season");


export type VibeStepProps = {
  onValidityChange?: (isValid: boolean) => void;
  sanityConfig?: TripBuilderConfig;
};

export function VibeStep({ onValidityChange, sanityConfig }: VibeStepProps) {
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

  const { userPreferences } = useAppState();
  const selectedVibes = useMemo(() => data.vibes ?? [], [data.vibes]);
  const isMaxSelected = selectedVibes.length >= MAX_VIBE_SELECTION;
  const hasSelectedVibes = selectedVibes.length > 0;
  const hasPrefilledVibes = userPreferences.defaultVibes.length > 0 &&
    selectedVibes.some((v) => userPreferences.defaultVibes.includes(v));

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

  const renderVibe = (vibe: (typeof TRIP_BUILDER_VIBES)[number], i: number) => {
    const isSelected = selectedVibes.includes(vibe.id);
    const isDisabled = isMaxSelected && !isSelected;
    const sanityVibe = sanityVibeMap?.get(vibe.id);

    return (
      <VibeCard
        key={vibe.id}
        name={sanityVibe?.name ?? vibe.name}
        description={sanityVibe?.description ?? vibe.description}
        index={i}
        isSelected={isSelected}
        isDisabled={isDisabled}
        onToggle={() => toggleVibe(vibe.id)}
      />
    );
  };

  return (
    <div className="flex flex-1 flex-col bg-background">
      {/* Header */}
      <div className="px-6 pt-8 text-center lg:pt-10">
        <p className="eyebrow-editorial text-brand-primary">
          STEP 03
        </p>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className={cn(typography({ intent: "editorial-h2" }), "tracking-tight")}
        >
          {sanityConfig?.vibeStepHeading ?? "How do you want to spend your days?"}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-2 text-sm text-stone"
        >
          {sanityConfig?.vibeStepDescription ?? "Pick up to 3. These shape what we schedule."}
        </motion.p>

        <div aria-live="polite">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3 font-mono text-xs tracking-wide text-stone/70"
          >
            {selectedVibes.length} / {MAX_VIBE_SELECTION} selected
          </motion.p>
          {hasPrefilledVibes && (
            <p className="mt-1 text-xs text-stone">Pre-selected from your profile</p>
          )}
        </div>
      </div>

      {/* Vibe list */}
      <div className="mx-auto mt-6 w-full max-w-2xl px-4 pb-24 sm:px-6 lg:mt-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="overflow-hidden rounded-lg border border-border bg-card divide-y divide-border"
        >
          {TRIP_BUILDER_VIBES.map((vibe, i) => renderVibe(vibe, i))}
        </motion.div>

        {/* Warning when max reached */}
        {isMaxSelected && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 text-center text-sm text-warning"
          >
            {(sanityConfig?.vibeStepMaxWarning ?? "All {max} picked. Tap one to swap it.").replace("{max}", String(MAX_VIBE_SELECTION))}
          </motion.p>
        )}
      </div>
    </div>
  );
}
