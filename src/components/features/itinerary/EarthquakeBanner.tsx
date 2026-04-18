"use client";

import { useState } from "react";
import type { EarthquakeAlert } from "@/lib/alerts/usgs";
import type { KnownRegionId } from "@/types/trip";

interface EarthquakeBannerProps {
  alert: EarthquakeAlert;
  region: KnownRegionId;
  tripId: string;
}

type RailOperator = {
  /** Used in body copy: "Check {bodyMention} before traveling." */
  bodyMention: string;
  /** Used as the CTA button label. */
  ctaLabel: string;
  url: string;
};

const RAIL_STATUS_BY_REGION: Record<KnownRegionId, RailOperator> = {
  kanto:    { bodyMention: "JR East service status",     ctaLabel: "JR East status",     url: "https://traininfo.jreast.co.jp/service_cloud/en/" },
  tohoku:   { bodyMention: "JR East service status",     ctaLabel: "JR East status",     url: "https://traininfo.jreast.co.jp/service_cloud/en/" },
  hokkaido: { bodyMention: "JR Hokkaido service status", ctaLabel: "JR Hokkaido status", url: "https://www.jrhokkaido.co.jp/network/status/" },
  kansai:   { bodyMention: "JR West service status",     ctaLabel: "JR West status",     url: "https://global.trafficinfo.westjr.co.jp/en/kansai" },
  chugoku:  { bodyMention: "JR West service status",     ctaLabel: "JR West status",     url: "https://global.trafficinfo.westjr.co.jp/en/chugoku" },
  shikoku:  { bodyMention: "JR Shikoku service status",  ctaLabel: "JR Shikoku status",  url: "https://www.jr-shikoku.co.jp/global/en/" },
  kyushu:   { bodyMention: "JR Kyushu service status",   ctaLabel: "JR Kyushu status",   url: "https://www.jrkyushu.co.jp/english/" },
  chubu:    { bodyMention: "JR Central service status",  ctaLabel: "JR Central status",  url: "https://global.jr-central.co.jp/en/" },
  okinawa:  { bodyMention: "Okinawa Monorail service",   ctaLabel: "Okinawa Monorail",   url: "https://www.yui-rail.co.jp/en/" },
};

export function EarthquakeBanner({ alert, region, tripId }: EarthquakeBannerProps) {
  const dismissKey = `yuku-earthquake-dismissed-${tripId}-${alert.id}`;

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(dismissKey) === "1";
  });

  if (dismissed) return null;

  const operator = RAIL_STATUS_BY_REGION[region];

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(dismissKey, "1");
    }
  };

  const headingId = `earthquake-banner-heading-${alert.id}`;

  return (
    <section
      role="status"
      aria-live="polite"
      aria-labelledby={headingId}
      className="rounded-md bg-orange-50 border border-orange-200 px-4 py-3"
    >
      <div className="flex gap-3">
        {/* Warning icon */}
        <div className="shrink-0 pt-0.5">
          <span className="text-xl" aria-hidden="true">⚠️</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h2 id={headingId} className="text-base font-medium text-orange-900">
            {`Magnitude ${alert.magnitude} Earthquake Near ${alert.nearestCity}`}
          </h2>
          <p data-testid="earthquake-banner-body" className="mt-1 text-sm text-orange-800">
            {`Struck ${alert.distanceKm} km from ${alert.nearestCity} ${alert.relativeTime}. Train inspections may cause transit delays. Check ${operator.bodyMention} before traveling.`}
          </p>

          {/* CTA Buttons */}
          <div className="mt-3 flex gap-2">
            <a
              href={operator.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-900 transition hover:bg-orange-200"
            >
              {operator.ctaLabel}
            </a>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center rounded-md bg-transparent px-3 py-1.5 text-xs font-medium text-orange-700 transition hover:bg-orange-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
