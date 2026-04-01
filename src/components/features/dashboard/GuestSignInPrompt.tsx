"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { GoogleSignInButton } from "@/components/ui/GoogleSignInButton";
import { easeReveal } from "@/lib/motion";

type GuestSignInPromptProps = {
  onDismiss: () => void;
};

export function GuestSignInPrompt({ onDismiss }: GuestSignInPromptProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  function handleDismiss() {
    setIsDismissed(true);
    onDismiss();
  }

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: easeReveal }}
          className="rounded-lg border border-border bg-surface p-5"
        >
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-3">
              <p className="text-sm font-medium text-foreground">
                Your trips are stored on this browser only.
              </p>
              <p className="text-xs text-foreground-secondary">
                Sign in to access them anywhere.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <GoogleSignInButton
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-[var(--shadow-sm)] transition-all hover:bg-surface hover:shadow-[var(--shadow-card)]"
                  label="Continue with Google"
                />
                <Link
                  href="/signin"
                  className="text-sm font-medium text-foreground-secondary transition-colors hover:text-foreground"
                >
                  Use email instead
                </Link>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="shrink-0 rounded-md p-1 text-stone transition-colors hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
