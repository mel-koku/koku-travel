"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { selectPocketPhrases } from "@/lib/phrases/phraseSelector";
import { easeReveal } from "@/lib/motion";

type PocketPhrasesProps = {
  locationCategory: string | undefined;
  tags: string[] | undefined;
  /** Stable seed for deterministic phrase selection (e.g., activity ID) */
  seed?: string;
};

export function PocketPhrases({ locationCategory, tags, seed }: PocketPhrasesProps) {
  const [open, setOpen] = useState(false);

  const phrases = useMemo(
    () => selectPocketPhrases(locationCategory, tags, seed),
    [locationCategory, tags, seed],
  );

  if (phrases.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-foreground-secondary transition hover:bg-brand-primary/5 hover:text-foreground"
      >
        <span>{"🗣️"}</span>
        <span>Say this:</span>
        <svg
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [...easeReveal] as [number, number, number, number] }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 space-y-2 rounded-xl bg-brand-primary/5 p-3">
              {phrases.map((phrase, index) => (
                <div key={index} className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground" lang="ja">
                    {phrase.japanese}
                  </p>
                  <p className="text-xs italic text-foreground-secondary">{phrase.romaji}</p>
                  <p className="text-xs text-foreground-secondary">
                    {phrase.english}
                    {phrase.context && (
                      <span className="text-stone"> — {phrase.context}</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
