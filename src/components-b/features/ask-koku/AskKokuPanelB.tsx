"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { AskKokuChatB } from "./AskKokuChatB";
import type { AskKokuContext } from "./AskKokuSuggestionsB";

const bEase = [0.25, 0.1, 0.25, 1] as const;

type AskKokuPanelProps = {
  onClose: () => void;
  context?: AskKokuContext;
};

export function AskKokuPanelB({ onClose, context }: AskKokuPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97 }}
      transition={{ duration: 0.3, ease: [...bEase] }}
      className="fixed inset-0 z-[60] flex flex-col bg-white lg:inset-auto lg:bottom-24 lg:right-6 lg:h-[600px] lg:w-[400px] lg:rounded-2xl lg:shadow-[var(--shadow-depth)]"
      data-lenis-prevent
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:pt-3">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Ask Koku</h2>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Chat area */}
      <AskKokuChatB onClose={onClose} context={context} />
    </motion.div>
  );
}
