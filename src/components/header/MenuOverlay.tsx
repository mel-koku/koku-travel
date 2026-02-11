"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useLenis } from "@/providers/LenisProvider";
import { easePageTransition } from "@/lib/motion";
import { MenuNav } from "./MenuNav";
import { MenuPanel } from "./MenuPanel";

type MenuOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
};


function focusTrigger() {
  const trigger = document.querySelector<HTMLButtonElement>('[data-menu-trigger]');
  trigger?.focus({ preventScroll: true });
}

export function MenuOverlay({ isOpen, onClose }: MenuOverlayProps) {
  const { pause, resume } = useLenis();
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const prefersReducedMotion = useReducedMotion();

  // Close on route change
  useEffect(() => {
    if (prevPathnameRef.current !== pathname && isOpen) {
      prevPathnameRef.current = pathname;
      onClose();
    } else {
      prevPathnameRef.current = pathname;
    }
  }, [pathname, isOpen, onClose]);

  // Pause/resume Lenis + body overflow
  useEffect(() => {
    if (isOpen) {
      pause();
      document.body.style.overflow = "hidden";
    } else {
      resume();
      document.body.style.overflow = "";
    }
    return () => {
      resume();
      document.body.style.overflow = "";
    };
  }, [isOpen, pause, resume]);

  // Escape key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
        focusTrigger();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Focus first nav link on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const firstLink = document.querySelector<HTMLAnchorElement>(
          '[data-menu-overlay] nav a'
        );
        firstLink?.focus({ preventScroll: true });
      }, 300);
      return () => clearTimeout(timer);
    } else {
      // Return focus to trigger on close
      focusTrigger();
    }
  }, [isOpen]);

  const overlayVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        hidden: { y: "-100%" },
        visible: {
          y: "0%",
          transition: { duration: 0.5, ease: easePageTransition },
        },
        exit: {
          y: "-100%",
          transition: { duration: 0.4, ease: easePageTransition },
        },
      };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="menu-overlay"
          data-menu-overlay
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-0 z-[100] bg-background"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="grid h-full grid-cols-1 lg:grid-cols-5">
            {/* Nav panel: 3 cols on desktop */}
            <div className="col-span-1 overflow-y-auto lg:col-span-3">
              <MenuNav onClose={onClose} />
            </div>

            {/* Image panel: 2 cols on desktop */}
            <div className="col-span-2">
              <MenuPanel />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
