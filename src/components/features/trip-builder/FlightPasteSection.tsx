"use client";

import { AnimatePresence, m } from "framer-motion";
import { ClipboardPaste, Check } from "lucide-react";

import { cn } from "@/lib/cn";
import { easeReveal } from "@/lib/motion";

export type FlightPasteSectionProps = {
  showFlightPaste: boolean;
  onToggleFlightPaste: () => void;
  flightPasteText: string;
  onFlightPasteTextChange: (text: string) => void;
  flightParseMessage: { type: "success" | "error"; text: string } | null;
  onClearParseMessage: () => void;
  onFlightParse: () => void;
};

export function FlightPasteSection({
  showFlightPaste,
  onToggleFlightPaste,
  flightPasteText,
  onFlightPasteTextChange,
  flightParseMessage,
  onClearParseMessage,
  onFlightParse,
}: FlightPasteSectionProps) {
  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={onToggleFlightPaste}
        className="flex items-center gap-1.5 text-xs text-stone transition-colors hover:text-foreground-secondary"
      >
        <ClipboardPaste className="h-3.5 w-3.5" />
        {showFlightPaste ? "Hide" : "Or paste your flight details"}
      </button>

      <AnimatePresence>
        {showFlightPaste && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: easeReveal }}
            className="overflow-hidden"
          >
            <div className="mt-2">
              <textarea
                value={flightPasteText}
                onChange={(e) => {
                  onFlightPasteTextChange(e.target.value);
                  onClearParseMessage();
                }}
                placeholder={"e.g. NH203 NRT 14:30\nor: Landing Narita 2:30 PM, Departing KIX 18:00"}
                rows={3}
                className="w-full resize-none rounded-md border border-border bg-surface p-3 text-base text-foreground placeholder:text-stone focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage"
              />
              <button
                type="button"
                onClick={onFlightParse}
                disabled={!flightPasteText.trim()}
                className="mt-2 rounded-md bg-sage/10 px-4 py-2 text-sm font-medium text-sage transition-colors hover:bg-sage/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Auto-fill
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Parse result message */}
      <AnimatePresence>
        {flightParseMessage && (
          <m.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "mt-2 text-xs",
              flightParseMessage.type === "success"
                ? "flex items-center gap-1 text-sage"
                : "text-stone",
            )}
          >
            {flightParseMessage.type === "success" && <Check className="h-3.5 w-3.5" />}
            {flightParseMessage.text}
          </m.p>
        )}
      </AnimatePresence>
    </div>
  );
}
