"use client";

import { cn } from "@/lib/utils";
import { typography } from "@/lib/typography-system";
import { motion } from "framer-motion";
import { easeEditorial, durationBase } from "@/lib/motion";
import type { UnlockTier } from "@/lib/billing/types";
import { getTierPriceDollars } from "@/lib/billing/access";

type UnlockCardProps = {
  tier: UnlockTier;
  cities: string[];
  totalDays: number;
  launchPricing?: boolean;
  launchSlotsRemaining?: number;
  onUnlock: () => void;
};

export function UnlockCard({
  tier,
  cities,
  totalDays,
  launchPricing,
  launchSlotsRemaining,
  onUnlock,
}: UnlockCardProps) {
  const price = getTierPriceDollars(tier);
  const cityList = cities
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
    .join(", ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durationBase, ease: [...easeEditorial] as [number, number, number, number] }}
      className="mx-auto my-8 max-w-lg rounded-lg bg-surface p-8 shadow-[var(--shadow-card)] text-center"
    >
      <p className="eyebrow-editorial mb-3">Your journey continues</p>

      <h3 className={cn(typography({ intent: "editorial-h3" }), "mb-4")}>
        Continue to {cityList}
      </h3>

      <p className={cn(typography({ intent: "utility-body-muted" }), "mb-2")}>
        {totalDays - 1} more days of routes, transit, tips, and daily briefings.
      </p>

      <p className={cn(typography({ intent: "utility-meta" }), "mb-6 text-foreground-secondary")}>
        We plan each trip from scratch. The Pass covers the cost.
      </p>

      {launchPricing && launchSlotsRemaining != null && launchSlotsRemaining > 0 && (
        <p className={cn(typography({ intent: "utility-meta" }), "mb-4 text-brand-primary")}>
          Launch pricing: {launchSlotsRemaining} of 100 Passes remaining at $19
        </p>
      )}

      <button
        onClick={onUnlock}
        className="btn-koku inline-flex h-12 items-center rounded-lg bg-brand-primary px-8 font-sans text-sm font-medium text-white active:scale-[0.98]"
      >
        Unlock for ${launchPricing ? 19 : price}
      </button>
    </motion.div>
  );
}
