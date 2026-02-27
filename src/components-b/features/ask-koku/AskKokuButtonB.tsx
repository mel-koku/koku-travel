"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { AskKokuPanelB } from "./AskKokuPanelB";
import type { AskKokuContext } from "./AskKokuSuggestionsB";

const bEase = [0.25, 0.1, 0.25, 1] as const;

const HIDDEN_PATHS = ["/b/places", "/b/trip-builder", "/studio"];

function deriveContext(pathname: string): AskKokuContext {
  if (pathname.startsWith("/b/places")) return "places";
  if (pathname.startsWith("/b/discover")) return "places";
  if (pathname.startsWith("/b/trip-builder")) return "trip-builder";
  if (pathname.startsWith("/b/dashboard")) return "dashboard";
  if (pathname.includes("/itinerary")) return "itinerary";
  return "default";
}

export function AskKokuButtonB() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) {
    return null;
  }

  const isTripBuilder = pathname.startsWith("/b/trip-builder");
  const context = deriveContext(pathname);

  return (
    <>
      {/* FAB — navy pill with label on desktop, icon-only on mobile */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`fixed right-6 z-50 flex h-12 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-white shadow-[var(--shadow-elevated)] transition-shadow hover:shadow-[var(--shadow-depth)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 sm:h-12 ${isTripBuilder ? "bottom-[calc(5rem+env(safe-area-inset-bottom))]" : "bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"}`}
        aria-label={open ? "Close chat" : "Ask Koku"}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15, ease: [...bEase] }}
            >
              <X className="h-5 w-5" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15, ease: [...bEase] }}
            >
              <MessageCircle className="h-5 w-5" />
            </motion.div>
          )}
        </AnimatePresence>
        <span className="hidden text-sm font-medium sm:inline">Ask Koku</span>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <AskKokuPanelB onClose={() => setOpen(false)} context={context} />
        )}
      </AnimatePresence>
    </>
  );
}
