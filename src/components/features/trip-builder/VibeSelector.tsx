"use client";

import { useCallback, useMemo } from "react";
import {
  Camera,
  Mountain,
  Sparkles,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { VIBES, MAX_VIBE_SELECTION, type VibeId } from "@/data/vibes";
import { cn } from "@/lib/cn";

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

export type VibeSelectorProps = {
  onSelectionChange?: (vibes: VibeId[]) => void;
};

export function VibeSelector({ onSelectionChange }: VibeSelectorProps) {
  const { data, setData } = useTripBuilder();

  const selectedVibes = useMemo(() => data.vibes ?? [], [data.vibes]);
  const isMaxSelected = selectedVibes.length >= MAX_VIBE_SELECTION;

  const toggleVibe = useCallback(
    (vibeId: VibeId) => {
      setData((prev) => {
        const current = new Set<VibeId>(prev.vibes ?? []);
        if (current.has(vibeId)) {
          current.delete(vibeId);
        } else {
          if (current.size >= MAX_VIBE_SELECTION) {
            return prev;
          }
          current.add(vibeId);
        }
        const nextVibes = Array.from(current);
        onSelectionChange?.(nextVibes);
        return {
          ...prev,
          vibes: nextVibes,
        };
      });
    },
    [setData, onSelectionChange]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-base font-semibold text-foreground">
            Travel Style
          </h4>
          <p className="text-sm text-stone">
            Select up to {MAX_VIBE_SELECTION} styles that match your ideal trip
          </p>
        </div>
        <span className="text-sm font-medium text-stone">
          {selectedVibes.length}/{MAX_VIBE_SELECTION}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {VIBES.map((vibe) => {
          const isSelected = selectedVibes.includes(vibe.id);
          const isDisabled = isMaxSelected && !isSelected;
          const Icon = VIBE_ICONS[vibe.icon] ?? Mountain;

          return (
            <button
              key={vibe.id}
              type="button"
              onClick={() => toggleVibe(vibe.id)}
              aria-pressed={isSelected}
              aria-disabled={isDisabled}
              className={cn(
                "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
                isSelected
                  ? "border-brand-primary bg-brand-primary/5"
                  : "border-border bg-background hover:border-brand-primary/30 hover:bg-surface/50",
                isDisabled && "cursor-not-allowed opacity-50 hover:border-border hover:bg-background"
              )}
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                  isSelected
                    ? "bg-brand-primary text-white"
                    : "bg-surface text-foreground-secondary group-hover:bg-brand-primary/10 group-hover:text-brand-primary"
                )}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="text-center">
                <span
                  className={cn(
                    "block text-sm font-medium transition-colors",
                    isSelected ? "text-brand-primary" : "text-foreground"
                  )}
                >
                  {vibe.name}
                </span>
                <span className="block text-xs text-stone line-clamp-2">
                  {vibe.description}
                </span>
              </div>
              {isSelected && (
                <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-white">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedVibes.length === 0 && (
        <p className="text-sm text-stone">
          Your selections help us recommend the best regions and activities.
        </p>
      )}

      {isMaxSelected && (
        <p className="text-sm text-warning">
          Maximum {MAX_VIBE_SELECTION} styles selected. Deselect one to choose another.
        </p>
      )}
    </div>
  );
}
