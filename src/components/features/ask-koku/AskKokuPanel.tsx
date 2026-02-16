"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { easeReveal } from "@/lib/motion";
import { AskKokuChat } from "./AskKokuChat";

type AskKokuPanelProps = {
  onClose: () => void;
};

export function AskKokuPanel({ onClose }: AskKokuPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: easeReveal }}
      className="fixed inset-0 z-50 flex flex-col bg-background lg:inset-auto lg:bottom-24 lg:right-6 lg:h-[600px] lg:w-[400px] lg:rounded-xl lg:border lg:border-border lg:shadow-2xl"
      data-lenis-prevent
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:pt-3">
        <h2 className="font-serif text-lg italic text-foreground">Ask Koku</h2>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-secondary transition-colors hover:bg-surface hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Chat area */}
      <AskKokuChat />
    </motion.div>
  );
}
