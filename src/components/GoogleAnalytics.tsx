"use client";

import Script from "next/script";
import { useEffect } from "react";
import { getConsent, CONSENT_EVENT } from "@/lib/cookieConsent";

const GA_ID = "G-XE8JEJN333";

export default function GoogleAnalytics() {
  useEffect(() => {
    const w = window as unknown as {
      gtag?: (...args: unknown[]) => void;
    };

    const initialGranted = getConsent() === "granted";
    if (initialGranted && typeof w.gtag === "function") {
      w.gtag("consent", "update", {
        analytics_storage: "granted",
      });
    }

    function onConsentChange(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (typeof w.gtag !== "function") return;
      w.gtag("consent", "update", {
        analytics_storage: detail === "granted" ? "granted" : "denied",
      });
    }

    window.addEventListener(CONSENT_EVENT, onConsentChange);
    return () => window.removeEventListener(CONSENT_EVENT, onConsentChange);
  }, []);

  return (
    <>
      <Script id="google-analytics-consent" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            'analytics_storage': 'denied',
            'ad_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied',
            'wait_for_update': 500
          });
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
    </>
  );
}
