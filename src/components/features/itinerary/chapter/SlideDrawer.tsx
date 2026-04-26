"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, m } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { typography } from "@/lib/typography-system";
import { easeEditorialMut, durationBase } from "@/lib/motion";

export type SlideDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  ariaLabel?: string;
  /** Removes padding and overflow-y-auto from content area so children own the layout */
  noPadding?: boolean;
  children: ReactNode;
};

export function SlideDrawer({
  open,
  onClose,
  title,
  ariaLabel,
  noPadding,
  children,
}: SlideDrawerProps) {
  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <m.div
            className="fixed inset-0 z-[60] bg-charcoal/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: durationBase * 0.75,
              ease: easeEditorialMut,
            }}
            onClick={onClose}
            role="presentation"
          />
          {/* Drawer */}
          <m.aside
            role="dialog"
            aria-label={ariaLabel ?? title}
            className={cn(
              "fixed right-0 top-0 h-[100dvh] w-full max-w-[560px]",
              "bg-background shadow-[var(--shadow-elevated)]",
              "flex flex-col z-[60]",
            )}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: durationBase, ease: easeEditorialMut }}
          >
            <header className="flex items-center justify-between gap-4 px-6 pt-5 pb-4 border-b border-border">
              <h2 className={cn(typography({ intent: "editorial-h3" }), "mb-0 text-2xl")}>
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 -mr-2 flex h-11 w-11 items-center justify-center rounded-md text-foreground-secondary hover:bg-canvas/50 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </header>
            <div className={noPadding ? "flex-1 min-h-0 overflow-hidden" : "flex-1 min-h-0 overflow-y-auto px-6 py-6"}>
              {children}
            </div>
          </m.aside>
        </>
      )}
    </AnimatePresence>
  );
}
