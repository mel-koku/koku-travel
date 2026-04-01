"use client";

import { useEffect, useState } from "react";
import { hasResponded, setConsent } from "@/lib/cookieConsent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasResponded()) setVisible(true);
  }, []);

  if (!visible) return null;

  function handleAccept() {
    setConsent(true);
    setVisible(false);
  }

  function handleDecline() {
    setConsent(false);
    setVisible(false);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface p-4 shadow-[var(--shadow-elevated)] sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-6">
      <p className="text-sm text-foreground-secondary">
        We use cookies for analytics to improve your experience. No personal data is shared with third parties.
      </p>
      <div className="mt-3 flex gap-3 sm:mt-0 sm:shrink-0">
        <button
          onClick={handleDecline}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground-secondary transition hover:bg-canvas active:scale-[0.98]"
        >
          Decline
        </button>
        <button
          onClick={handleAccept}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-secondary active:scale-[0.98]"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
