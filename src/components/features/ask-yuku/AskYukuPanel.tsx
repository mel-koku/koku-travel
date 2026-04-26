"use client";

import { m } from "framer-motion";
import { X } from "lucide-react";
import { easeReveal } from "@/lib/motion";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/cn";
import { AskYukuChat } from "./AskYukuChat";
import type { AskYukuContext } from "./AskYukuSuggestions";

type AskYukuPanelProps = {
  onClose: () => void;
  context?: AskYukuContext;
  tripData?: string;
};

export function AskYukuPanel({ onClose, context, tripData }: AskYukuPanelProps) {
  return (
    <m.div
      data-ask-yuku
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: easeReveal }}
      id="ask-yuku-panel"
      role="dialog"
      aria-label="Ask Yuku chat"
      className="fixed inset-0 z-50 flex flex-col bg-background lg:inset-auto lg:bottom-24 lg:right-6 lg:h-[600px] lg:w-[400px] lg:rounded-lg lg:border lg:border-border lg:shadow-[var(--shadow-elevated)]"
      data-lenis-prevent
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:pt-3">
        <h2 className={cn(typography({ intent: "editorial-h3" }), "text-lg md:text-lg")}>Ask Yuku</h2>
        <button
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground-secondary transition-colors hover:bg-surface hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Chat area */}
      <AskYukuChat onClose={onClose} context={context} tripData={tripData} />
    </m.div>
  );
}
