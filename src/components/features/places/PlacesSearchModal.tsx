"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const isBrowser = typeof window !== "undefined";

type PlacesSearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Full-bleed overlay that hosts the existing CategoryBar + grid + map +
 * FilterPanel browse experience as a search modal — opened on hero search
 * focus or "Browse all places" click. Keeps the lanes page underneath as a
 * brand surface; restores body scroll on close.
 */
export function PlacesSearchModal({ isOpen, onClose, children }: PlacesSearchModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isBrowser || !isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const mainEl = document.getElementById("main-content");
    if (mainEl) mainEl.setAttribute("inert", "");

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = originalOverflow;
      if (mainEl) mainEl.removeAttribute("inert");
      document.removeEventListener("keydown", handleKey);
      previouslyFocused.current?.focus({ preventScroll: true });
      previouslyFocused.current = null;
    };
  }, [isOpen, onClose]);

  if (!isBrowser || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-40 bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Search places"
      data-lenis-prevent
    >
      <div ref={panelRef} className="relative flex h-[100dvh] flex-col overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="absolute right-3 top-3 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-[var(--shadow-card)] backdrop-blur transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
