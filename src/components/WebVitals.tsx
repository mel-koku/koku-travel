"use client";

import { useEffect, useState } from "react";
import { initWebVitals } from "@/lib/web-vitals";
import { getConsent, CONSENT_EVENT } from "@/lib/cookieConsent";

/**
 * WebVitals Component
 * Initializes Web Vitals tracking on the client side.
 * Only activates after cookie consent is granted.
 */
export function WebVitals() {
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    setConsent(getConsent() === "granted");

    function onConsentChange(e: Event) {
      const detail = (e as CustomEvent).detail;
      setConsent(detail === "granted");
    }

    window.addEventListener(CONSENT_EVENT, onConsentChange);
    return () => window.removeEventListener(CONSENT_EVENT, onConsentChange);
  }, []);

  useEffect(() => {
    if (consent) {
      initWebVitals();
    }
  }, [consent]);

  return null;
}

