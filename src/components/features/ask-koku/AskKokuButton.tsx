"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { easeReveal } from "@/lib/motion";
import { AskKokuPanel } from "./AskKokuPanel";

const HIDDEN_PATHS = ["/studio", "/trip-builder", "/explore"];

export function AskKokuButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Hide on studio and trip-builder
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg transition-transform hover:shadow-xl active:scale-[0.95]"
        aria-label={open ? "Close chat" : "Ask Koku"}
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
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15, ease: easeReveal }}
            >
              <MessageCircle className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && <AskKokuPanel onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
