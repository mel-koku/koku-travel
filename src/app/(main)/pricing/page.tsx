import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { TIER_PRICES, type UnlockTier } from "@/lib/billing/types";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Pricing | Yuku Japan",
  description:
    "Trip Pass pricing for Yuku Japan. Full multi-day itineraries with transit routing, daily briefings, and insider tips.",
  alternates: {
    canonical: "/pricing",
  },
};

const tiers: { tier: UnlockTier; label: string; days: string; bestFor: string }[] = [
  { tier: "short", label: "Short Trip", days: "1\u20137 days", bestFor: "Weekends and first visits" },
  { tier: "standard", label: "Standard Trip", days: "8\u201314 days", bestFor: "Classic Tokyo, Kyoto, Osaka routes" },
  { tier: "long", label: "Extended Trip", days: "15\u201321 days", bestFor: "Grand tours and deeper dives" },
];

const features = [
  "Multi-day routing",
  "Transit directions with lines and platforms",
  "Daily briefings",
  "Insider tips",
  "Unlimited refinements",
  "Shareable itinerary link",
];

async function getLaunchSlots(): Promise<{
  remaining: number;
  total: number;
} | null> {
  try {
    const supabase = getServiceRoleClient();
    const { data } = await supabase
      .from("launch_pricing")
      .select("remaining_slots, total_slots")
      .eq("id", "default")
      .single();
    if (!data) return null;
    return { remaining: data.remaining_slots, total: data.total_slots };
  } catch {
    return null;
  }
}

export default async function PricingPage() {
  const launchSlots = await getLaunchSlots();
  const showLaunchBanner =
    launchSlots !== null && launchSlots.remaining > 0;
  const isFreePromo =
    process.env.NEXT_PUBLIC_FREE_FULL_ACCESS === "true" &&
    launchSlots !== null &&
    launchSlots.remaining > 0;

  return (
    <main className="min-h-[100dvh]">
      {/* Section 1: Editorial Hero */}
      <section className="bg-background px-6 py-12 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <ScrollReveal delay={0.08}>
            <h1
              className={cn(
                typography({ intent: "editorial-h1" }),
                "text-[clamp(2rem,4vw,3rem)] mb-6",
              )}
            >
              Every detail, planned from scratch
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.16}>
            <p
              className={cn(
                typography({ intent: "utility-body" }),
                "text-foreground-secondary",
              )}
            >
              Your trip is built day by day with real transit connections,
              platform numbers, and daily briefings written for the way you
              travel. One pass unlocks every day.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Section 2: Tier Cards + Launch Banner + Features */}
      <section className="bg-canvas px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-4xl">
          {/* Launch Pricing Banner */}
          {isFreePromo ? (
            <ScrollReveal>
              <p
                className={cn(
                  typography({ intent: "utility-meta" }),
                  "mb-8 text-center text-brand-primary",
                )}
              >
                Trip Pass is free for our first {launchSlots.total} travellers.{" "}
                {launchSlots.remaining} remaining.
              </p>
            </ScrollReveal>
          ) : showLaunchBanner ? (
            <ScrollReveal>
              <p
                className={cn(
                  typography({ intent: "utility-meta" }),
                  "mb-8 text-center text-brand-primary",
                )}
              >
                Launch pricing: {launchSlots.remaining} of {launchSlots.total} Passes at $19
              </p>
            </ScrollReveal>
          ) : null}

          {/* Tier Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {tiers.map((t, i) => (
              <ScrollReveal key={t.tier} delay={0.08 * i}>
                <div className="rounded-lg bg-surface p-8 text-center shadow-[var(--shadow-card)]">
                  <p
                    className={typography({
                      intent: "utility-label",
                    })}
                  >
                    {t.label}
                  </p>
                  <p
                    className={cn(
                      typography({ intent: "utility-body-muted" }),
                      "mt-1",
                    )}
                  >
                    {t.days}
                  </p>
                  {isFreePromo ? (
                    <div className="mt-4 flex items-baseline justify-center gap-3">
                      <span
                        className={cn(
                          "font-serif text-3xl tracking-tight text-foreground-secondary line-through",
                        )}
                      >
                        ${TIER_PRICES[t.tier] / 100}
                      </span>
                      <span
                        className={cn(
                          "font-serif text-5xl tracking-tight text-brand-primary",
                        )}
                      >
                        Free
                      </span>
                    </div>
                  ) : (
                    <p
                      className={cn(
                        "mt-4 font-serif text-5xl tracking-tight text-foreground",
                      )}
                    >
                      ${TIER_PRICES[t.tier] / 100}
                    </p>
                  )}
                  <p
                    className={cn(
                      typography({ intent: "utility-meta" }),
                      "mt-3 text-foreground-secondary",
                    )}
                  >
                    {t.bestFor}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Shared Feature List */}
          <ScrollReveal delay={0.32}>
            <div className="mx-auto mt-12 max-w-md">
              <p
                className={cn(
                  typography({ intent: "utility-label" }),
                  "mb-4 text-center",
                )}
              >
                Every Pass includes
              </p>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {features.map((f) => (
                  <li
                    key={f}
                    className={cn(
                      typography({ intent: "utility-body" }),
                      "flex items-start gap-2 text-foreground-secondary",
                    )}
                  >
                    <span className="mt-1 text-brand-primary">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Section 3: Closing CTA */}
      <section className="bg-background px-6 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-md text-center">
          <ScrollReveal>
            <h2
              className={cn(
                typography({ intent: "editorial-h2" }),
                "mb-4",
              )}
            >
              Start planning
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <p
              className={cn(
                typography({ intent: "utility-body-muted" }),
                "mb-8",
              )}
            >
              {isFreePromo
                ? "All days free during our launch. No payment required."
                : "Day 1 is always free. See your trip before you decide."}
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.16}>
            <Link
              href="/trip-builder"
              className="btn-yuku inline-flex h-12 items-center rounded-lg bg-brand-primary px-8 font-sans text-sm font-medium text-white active:scale-[0.98]"
            >
              Build My Trip
            </Link>
          </ScrollReveal>
          <ScrollReveal delay={0.24}>
            <p className="mt-6">
              <Link
                href="/dashboard"
                className={cn(
                  typography({ intent: "utility-meta" }),
                  "text-foreground-secondary underline-offset-4 hover:underline",
                )}
              >
                Already have a trip? Go to your dashboard
              </Link>
            </p>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
