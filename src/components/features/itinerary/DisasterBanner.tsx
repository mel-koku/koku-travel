"use client";

import { useEffect, useState } from "react";
import type { StoredTrip } from "@/services/trip/types";
import type { WeatherRegion } from "@/data/regions";
import { logTipEvent } from "@/lib/telemetry/tipEvents";
import { useTipEventContext } from "@/lib/telemetry/useTipEventContext";

interface DisasterBannerProps {
  trip: StoredTrip;
  region: WeatherRegion;
}

// Copy variants per region
const COPY_BY_REGION: Record<WeatherRegion, { heading: string; body: string }> = {
  temperate: {
    heading: "Typhoon Season Alert",
    body: "Peak typhoon months (Aug–Oct) can disrupt flights and trains. Refundable bookings for the first and last days of your trip.",
  },
  tropical_south: {
    heading: "Typhoon & Weather Alert",
    body: "Typhoon season (Jun–Sep) means sudden weather changes and potential transport delays. Refundable bookings and flexible plans are essential.",
  },
  subarctic_north: {
    heading: "Late-Summer Typhoon Risk",
    body: "Late-summer typhoons are rare but possible (Oct–Nov edge cases). Check forecasts daily if traveling in autumn.",
  },
};

export function DisasterBanner({ trip, region }: DisasterBannerProps) {
  const sessionKey = `yuku-disaster-dismissed-${trip.id}`;
  const tipContext = useTipEventContext(trip.id, region);

  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(sessionKey) === "1";
  });

  useEffect(() => {
    if (isDismissed) return;
    void logTipEvent("disaster", "rendered", tipContext);
  }, [isDismissed, tipContext]);

  if (isDismissed) return null;

  const copy = COPY_BY_REGION[region];

  const handleDismiss = () => {
    void logTipEvent("disaster", "dismissed", tipContext);
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(sessionKey, "1");
    }
  };

  const handleLearnMore = () => {
    // Link to JNTO Safety Tips or relevant external resource
    // For now, we open a new tab to Japan travel safety info
    window.open("https://www.jnto.go.jp/", "_blank", "noopener,noreferrer");
  };

  return (
    <section className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3">
      <div className="flex gap-3">
        {/* Warning icon */}
        <div className="shrink-0 pt-0.5">
          <span className="text-xl" aria-hidden="true">
            ⚠️
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-medium text-amber-900">{copy.heading}</h2>
          <p className="mt-1 text-sm text-amber-800">{copy.body}</p>

          {/* CTA Buttons */}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleLearnMore}
              className="inline-flex items-center rounded-md bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:bg-amber-200"
            >
              Learn More
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center rounded-md bg-transparent px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
