"use client";

import { useState, useEffect, useRef } from "react";
import { Lightbulb } from "lucide-react";
import type { DetectedGap } from "@/lib/smartPrompts/gapDetection";
import { SmartPromptCardB } from "./SmartPromptCardB";

type SuggestionsPopoverBProps = {
  suggestions: DetectedGap[];
  onAccept: (gap: DetectedGap) => void;
  onSkip: (gap: DetectedGap) => void;
  loadingSuggestionId?: string | null;
};

export function SuggestionsPopoverB({
  suggestions,
  onAccept,
  onSkip,
  loadingSuggestionId,
}: SuggestionsPopoverBProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const prevCount = useRef(suggestions.length);

  // Click-outside close (desktop)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Auto-close when all suggestions handled
  useEffect(() => {
    if (open && prevCount.current > 0 && suggestions.length === 0) {
      setOpen(false);
    }
    prevCount.current = suggestions.length;
  }, [suggestions.length, open]);

  if (suggestions.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      {/* Trigger pill */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-semibold transition-colors active:scale-[0.98]"
        style={{
          backgroundColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
          color: "var(--primary)",
        }}
        aria-label={`${suggestions.length} suggestions`}
      >
        <Lightbulb className="h-3 w-3" />
        <span>{suggestions.length}</span>
      </button>

      {/* Desktop popover (lg+) */}
      {open && (
        <>
          <div
            className="absolute right-0 top-full z-30 mt-1.5 hidden w-96 max-h-96 overflow-y-auto rounded-2xl border lg:block"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--card)",
              boxShadow: "var(--shadow-elevated)",
            }}
          >
            <div
              className="px-4 pt-3 pb-1 text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Suggestions
            </div>
            {suggestions.map((gap) => (
              <SmartPromptCardB
                key={gap.id}
                gap={gap}
                onAccept={onAccept}
                onSkip={onSkip}
                isLoading={loadingSuggestionId === gap.id}
                flat
              />
            ))}
          </div>

          {/* Mobile bottom sheet (<lg) */}
          <div
            className="fixed inset-0 z-30 lg:hidden"
            style={{ backgroundColor: "color-mix(in srgb, var(--charcoal) 50%, transparent)" }}
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-40 max-h-[60vh] overflow-y-auto rounded-t-2xl lg:hidden"
            style={{
              backgroundColor: "var(--card)",
              boxShadow: "var(--shadow-elevated)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div
                className="h-1 w-8 rounded-full"
                style={{ backgroundColor: "var(--border)" }}
              />
            </div>
            <div
              className="px-4 pb-2 text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Suggestions
            </div>
            {suggestions.map((gap) => (
              <SmartPromptCardB
                key={gap.id}
                gap={gap}
                onAccept={onAccept}
                onSkip={onSkip}
                isLoading={loadingSuggestionId === gap.id}
                flat
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
