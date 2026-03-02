"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

type TimePickerProps = {
  value?: string; // "HH:MM" format
  onChange: (time: string | undefined) => void;
  accent?: "sage" | "brand-primary";
  placeholder?: string;
};

const HOURS = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0"),
);
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  (i * 5).toString().padStart(2, "0"),
);

export function TimePicker({
  value,
  onChange,
  accent = "sage",
  placeholder = "Set time",
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<React.CSSProperties>({});

  const [hour, minute] = value ? value.split(":") : ["", ""];

  // Position the dropdown relative to the trigger
  useEffect(() => {
    if (!open || !triggerRef.current) return;

    const calculate = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportHeight = window.innerHeight;
      const panelHeight = 280;
      const gap = 4;

      const fitsBelow =
        rect.bottom + gap + panelHeight < viewportHeight - 8;

      setPosition({
        position: "fixed",
        left: `${rect.left}px`,
        ...(fitsBelow
          ? { top: `${rect.bottom + gap}px` }
          : { bottom: `${viewportHeight - rect.top + gap}px` }),
      });
    };

    calculate();
    window.addEventListener("scroll", calculate, true);
    window.addEventListener("resize", calculate);
    return () => {
      window.removeEventListener("scroll", calculate, true);
      window.removeEventListener("resize", calculate);
    };
  }, [open]);

  // Auto-scroll to selected values on open
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      if (hour && hoursRef.current) {
        const el = hoursRef.current.querySelector(
          `[data-value="${hour}"]`,
        ) as HTMLElement;
        el?.scrollIntoView({ block: "center" });
      }
      if (minute && minutesRef.current) {
        const el = minutesRef.current.querySelector(
          `[data-value="${minute}"]`,
        ) as HTMLElement;
        el?.scrollIntoView({ block: "center" });
      }
    });
  }, [open, hour, minute]);

  // Click-outside and Escape to close
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const selectHour = useCallback(
    (h: string) => {
      const m = minute || "00";
      onChange(`${h}:${m}`);
    },
    [minute, onChange],
  );

  const selectMinute = useCallback(
    (m: string) => {
      const h = hour || "12";
      onChange(`${h}:${m}`);
    },
    [hour, onChange],
  );

  const isSage = accent === "sage";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "h-9 w-[7rem] rounded-lg border border-border bg-background px-3 text-left font-mono text-sm transition-colors",
          "focus:outline-none focus:ring-1",
          value ? "text-foreground" : "text-stone",
          isSage
            ? "focus:border-sage focus:ring-sage"
            : "focus:border-brand-primary focus:ring-brand-primary",
        )}
      >
        {value || placeholder}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            data-lenis-prevent
            style={position}
            className="z-[60] flex rounded-xl border border-border/25 bg-background shadow-lg"
          >
            {/* Hours column */}
            <div
              ref={hoursRef}
              className="flex h-[280px] w-16 flex-col overflow-y-auto overscroll-contain border-r border-border/20 pb-1"
            >
              <span className="sticky top-0 z-[1] rounded-tl-xl bg-surface px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone">
                Hr
              </span>
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  data-value={h}
                  onClick={() => selectHour(h)}
                  className={cn(
                    "mx-1 flex h-9 min-h-[36px] shrink-0 items-center justify-center rounded-lg font-mono text-sm transition-colors",
                    h === hour
                      ? isSage
                        ? "bg-sage/20 text-sage"
                        : "bg-brand-primary/20 text-brand-primary"
                      : isSage
                        ? "text-foreground-secondary hover:bg-sage/10"
                        : "text-foreground-secondary hover:bg-brand-primary/10",
                  )}
                >
                  {h}
                </button>
              ))}
            </div>

            {/* Minutes column */}
            <div
              ref={minutesRef}
              className="flex h-[280px] w-16 flex-col overflow-y-auto overscroll-contain pb-1"
            >
              <span className="sticky top-0 z-[1] rounded-tr-xl bg-surface px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone">
                Min
              </span>
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  data-value={m}
                  onClick={() => selectMinute(m)}
                  className={cn(
                    "mx-1 flex h-9 min-h-[36px] shrink-0 items-center justify-center rounded-lg font-mono text-sm transition-colors",
                    m === minute
                      ? isSage
                        ? "bg-sage/20 text-sage"
                        : "bg-brand-primary/20 text-brand-primary"
                      : isSage
                        ? "text-foreground-secondary hover:bg-sage/10"
                        : "text-foreground-secondary hover:bg-brand-primary/10",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
