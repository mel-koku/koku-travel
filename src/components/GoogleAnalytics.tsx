"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { getConsent, CONSENT_EVENT } from "@/lib/cookieConsent";

const GA_ID = "G-XE8JEJN333";

export default function GoogleAnalytics() {
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

  if (!consent) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
