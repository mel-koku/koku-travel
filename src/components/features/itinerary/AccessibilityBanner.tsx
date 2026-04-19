"use client";

import { useState } from "react";
import type { StoredTrip } from "@/services/trip/types";

type Props = {
  trip: StoredTrip;
};

export function AccessibilityBanner({ trip }: Props) {
  const sessionKey = `yuku-accessibility-dismissed-${trip.id}`;

  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(sessionKey) === "1";
  });

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(sessionKey, "1");
    }
  };

  const handleLearnMore = () => {
    window.open(
      "https://www.tabifuku.jp/",
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <section className="rounded-md bg-surface px-4 py-3">
      <div className="flex gap-3">
        <div className="shrink-0 pt-0.5">
          <span className="text-xl" aria-hidden="true">
            ♿
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-base font-medium text-foreground">
            Accessibility in Japan
          </h2>
          <ul className="mt-2 space-y-2 text-sm text-foreground-secondary">
            <li>
              Major stations on JR East, Tokyo Metro, and Osaka Metro publish
              accessible-route maps with elevator access to every platform.
              Google Maps shows accessible entrances for free; NAVITIME adds
              more detail in its paid tier.
            </li>
            <li>
              Temple and shrine access varies widely. JNTO lists accessibility
              notes for major sites, but mountain-side destinations like
              Kiyomizudera, Hasedera, and Fushimi Inari keep original stone
              steps even at their so-called accessible paths.
            </li>
            <li>
              Major department stores like Isetan, Takashimaya, and Mitsukoshi
              reliably offer accessible restrooms and nursing rooms on most
              floors (look for 授乳室 signage). Konbini facilities are
              hit-or-miss. Note that many department stores close one day a
              week, so double-check before planning a rest stop.
            </li>
            <li>
              Booking sites like Booking.com and Rakuten Travel filter for
              wheelchair-accessible rooms. Direct-call the property to confirm,
              since listings occasionally mislabel older buildings.
            </li>
            <li>
              Japan Accessible Tourism Center (tabifuku.jp) provides
              multilingual itinerary advice and wheelchair rental contacts.
              Calling destinations a day ahead is the local norm for
              confirming access.
            </li>
          </ul>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleLearnMore}
              className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium text-stone transition hover:bg-surface"
            >
              Accessibility resources
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center rounded-md bg-transparent px-3 py-1.5 text-xs font-medium text-foreground-secondary transition hover:bg-sand"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
