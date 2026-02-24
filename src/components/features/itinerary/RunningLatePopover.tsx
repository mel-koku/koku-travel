"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type RunningLatePopoverProps = {
  onApplyDelay: (delayMinutes: number) => void;
};

const PRESETS = [
  { label: "+15 min", value: 15 },
  { label: "+30 min", value: 30 },
  { label: "+1 hr", value: 60 },
];

export function RunningLatePopover({ onApplyDelay }: RunningLatePopoverProps) {
  const [open, setOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
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

  const applyPreset = useCallback(
    (minutes: number) => {
      onApplyDelay(minutes);
      setOpen(false);
    },
    [onApplyDelay],
  );

  const applyCustom = useCallback(() => {
    const parsed = parseInt(customMinutes, 10);
    if (!parsed || parsed < 1 || parsed > 180) return;
    onApplyDelay(parsed);
    setCustomMinutes("");
    setOpen(false);
  }, [customMinutes, onApplyDelay]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-stone hover:text-foreground-secondary transition-colors"
      >
        Running late?
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-52 rounded-xl border border-border bg-surface p-3 shadow-lg">
          <p className="mb-2 text-xs font-medium text-foreground-secondary">
            Shift remaining activities
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => applyPreset(preset.value)}
                className="rounded-lg bg-background px-4 py-2.5 text-sm font-medium min-h-[44px] text-foreground transition-colors hover:bg-brand-primary/10 hover:text-brand-primary"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={180}
              placeholder="min"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyCustom()}
              className="h-11 w-20 rounded-lg border border-border bg-background px-2 text-center text-base text-foreground placeholder:text-stone focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
            <button
              type="button"
              onClick={applyCustom}
              disabled={!customMinutes || parseInt(customMinutes, 10) < 1}
              className="rounded-lg bg-brand-primary/10 px-4 py-2.5 text-sm font-medium min-h-[44px] text-brand-primary transition-colors hover:bg-brand-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
