"use client";

import { useEffect, useState } from "react";
import { hasResponded, setConsent } from "@/lib/cookieConsent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!hasResponded()) {
      setVisible(true);
      // Delay mount animation to next frame so CSS transition triggers
      requestAnimationFrame(() => setMounted(true));
    }
  }, []);

  if (!visible) return null;

  function dismiss(granted: boolean) {
    setConsent(granted);
    setMounted(false);
    // Wait for exit animation before unmounting
    setTimeout(() => setVisible(false), 300);
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-lg bg-charcoal p-4 shadow-[var(--shadow-elevated)] transition-all duration-300 ease-out sm:bottom-6 sm:right-6"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <p className="text-[13px] leading-relaxed text-white/80">
        We use cookies for analytics to improve your experience. No personal
        data is shared with third parties.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => dismiss(true)}
          className="rounded-md bg-white/15 px-3.5 py-1.5 text-[13px] font-medium text-white transition hover:bg-white/25 active:scale-[0.98]"
        >
          Got it
        </button>
        <button
          onClick={() => dismiss(false)}
          className="text-[13px] text-white/50 transition hover:text-white/70"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
