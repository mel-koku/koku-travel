"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { easeReveal } from "@/lib/motion";
import { AskYukuPanel } from "./AskYukuPanel";
import { useAppState } from "@/state/AppState";
import { serializeTripContext } from "@/lib/chat/serializeTripContext";
import { hasResponded, CONSENT_EVENT } from "@/lib/cookieConsent";
import type { AskYukuContext } from "./AskYukuSuggestions";

const HIDDEN_PATHS = ["/studio", "/places"];

function deriveContext(pathname: string): AskYukuContext {
  if (pathname.startsWith("/places")) return "places";
  if (pathname.startsWith("/trip-builder")) return "trip-builder";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.includes("/itinerary")) return "itinerary";
  return "default";
}

export function AskYukuButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { trips } = useAppState();

  const [consentResolved, setConsentResolved] = useState(() => hasResponded());

  useEffect(() => {
    if (consentResolved) return;
    const handler = () => setConsentResolved(true);
    window.addEventListener(CONSENT_EVENT, handler);
    return () => window.removeEventListener(CONSENT_EVENT, handler);
  }, [consentResolved]);

  // Escape closes the chat panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const context = deriveContext(pathname);

  // Serialize trip context when on itinerary page
  const tripData = useMemo(() => {
    if (context !== "itinerary") return undefined;
    const tripId = searchParams.get("trip");
    if (!tripId) return undefined;
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return undefined;
    return serializeTripContext(trip);
  }, [context, searchParams, trips]);

  // Hide on studio and explore, or while cookie banner is showing
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p)) || !consentResolved) {
    return null;
  }

  const isTripBuilder = pathname.startsWith("/trip-builder");

  return (
    <>
      {/* FAB */}
      <button
        data-ask-yuku
        onClick={() => setOpen((prev) => !prev)}
        className={`fixed right-6 z-50 flex h-11 items-center justify-center rounded-full border border-border bg-white text-foreground shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-elevated)] active:scale-[0.98] ${open ? "w-11" : "px-4"} ${isTripBuilder ? "bottom-[calc(5rem+env(safe-area-inset-bottom))]" : "bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"}`}
        aria-label={open ? "Close chat" : "Ask Yuku"}
        aria-expanded={open}
        aria-controls="ask-yuku-panel"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15, ease: easeReveal }}
            >
              <X className="h-5 w-5" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15, ease: easeReveal }}
            >
              <span className="text-sm font-medium">Ask Yuku</span>
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <AskYukuPanel onClose={() => setOpen(false)} context={context} tripData={tripData} />
        )}
      </AnimatePresence>
    </>
  );
}
