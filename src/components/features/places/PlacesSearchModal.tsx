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

    // Auto-focus the first text input inside the panel, but only after two
    // animation frames so the modal has painted and (on iOS) the keyboard
    // doesn't slide up at the same instant the overlay is animating in.
    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        const input = panelRef.current?.querySelector<HTMLInputElement>(
          'input[type="text"], input:not([type])',
        );
        input?.focus({ preventScroll: true });
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      document.body.style.overflow = originalOverflow;
      if (mainEl) mainEl.removeAttribute("inert");
      document.removeEventListener("keydown", handleKey);
      previouslyFocused.current?.focus({ preventScroll: true });
      previouslyFocused.current = null;
    };
  }, [isOpen, onClose]);

  if (!isBrowser || !isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[60]" data-lenis-prevent>
      {/* Backdrop — blurs the page behind the panel and dismisses on click. */}
      <div
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
        onMouseDown={handleBackdropClick}
        role="presentation"
      />
      {/* Panel — centered with viewport padding so it reads as a dialog,
          not a full-page replacement. */}
      <div
        ref={panelRef}
        className="absolute inset-4 sm:inset-8 lg:inset-12 flex flex-col overflow-hidden rounded-lg bg-background shadow-[var(--shadow-elevated)]"
        role="dialog"
        aria-modal="true"
        aria-label="Search places"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-[var(--shadow-card)] backdrop-blur transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex-1 overflow-y-auto pt-14 sm:pt-16 pb-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
