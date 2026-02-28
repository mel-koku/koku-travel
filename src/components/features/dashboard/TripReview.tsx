"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useInView } from "framer-motion";
import { MapPin, Star, Calendar, Compass, ArrowLeft } from "lucide-react";
import { REGIONS } from "@/data/regions";
import { easeReveal } from "@/lib/motion";

const ease = [...easeReveal] as [number, number, number, number];

type SummaryData = {
  tripName: string;
  totalDays: number;
  cities: string[];
  totalActivities: number;
  avgRating: number | null;
  ratedCount: number;
  topRated: {
    activityId: string;
    locationId: string | null;
    title: string;
    rating: number;
  }[];
  perCity: {
    cityId: string;
    activityCount: number;
    avgRating: number | null;
  }[];
};

// Lazy-load map
const TripReviewMap = dynamic(
  () => import("./TripReviewMap").then((m) => m.TripReviewMap),
  { ssr: false },
);

function getCityName(cityId: string): string {
  for (const region of REGIONS) {
    const city = region.cities.find((c) => c.id === cityId);
    if (city) return city.name;
  }
  return cityId.charAt(0).toUpperCase() + cityId.slice(1);
}

/** Animate a number from 0 to target over ~1.2s when visible. */
function AnimatedCounter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let rafId: number;
    const duration = 1200;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [inView, value]);

  return <span ref={ref}>{display.toLocaleString()}</span>;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={`h-4 w-4 ${star <= rating ? "fill-brand-secondary text-brand-secondary" : "text-stone/30"}`}
        />
      ))}
    </div>
  );
}

export function TripReview({ tripId }: { tripId: string }) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchSummary() {
      try {
        const res = await fetch(`/api/trips/${tripId}/summary`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to load summary");
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchSummary();
    return () => { cancelled = true; };
  }, [tripId]);

  const cityNames = useMemo(
    () => (data?.cities ?? []).map(getCityName),
    [data?.cities],
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="text-foreground-secondary">{error ?? "Trip summary not available."}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-brand-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-foreground-secondary transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
      >
        <p className="font-mono text-xs font-semibold uppercase tracking-wide text-brand-primary">
          Your Japan Journey
        </p>
        <h1 className="mt-2 font-serif italic text-3xl text-foreground sm:text-4xl">
          {data.tripName}
        </h1>
        {cityNames.length > 0 && (
          <p className="mt-2 text-sm text-foreground-secondary">
            {cityNames.join(" · ")}
          </p>
        )}
      </motion.div>

      {/* Stats grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease }}
        className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4"
      >
        <StatCard icon={<Calendar className="h-5 w-5 text-brand-primary" />} label="Days" value={data.totalDays} />
        <StatCard icon={<MapPin className="h-5 w-5 text-brand-primary" />} label="Cities" value={data.cities.length} />
        <StatCard icon={<Compass className="h-5 w-5 text-brand-primary" />} label="Activities" value={data.totalActivities} />
        {data.avgRating !== null && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface p-4">
            <Star className="h-5 w-5 text-brand-secondary" />
            <p className="mt-2 font-mono text-2xl font-bold text-foreground">{data.avgRating}</p>
            <p className="mt-1 text-xs text-stone">Avg rating</p>
          </div>
        )}
      </motion.div>

      {/* Top rated highlights */}
      {data.topRated.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease }}
          className="mt-10"
        >
          <h2 className="font-serif italic text-xl text-foreground">Highlights</h2>
          <p className="mt-1 text-sm text-foreground-secondary">Your top-rated experiences</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {data.topRated.map((item, i) => (
              <motion.div
                key={item.activityId}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.1, ease }}
                className="rounded-xl border border-border bg-surface p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-stone">#{i + 1}</span>
                  <StarRating rating={item.rating} />
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">{item.title}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* City breakdown */}
      {data.perCity.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45, ease }}
          className="mt-10"
        >
          <h2 className="font-serif italic text-xl text-foreground">By City</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.perCity.map((city) => (
              <div
                key={city.cityId}
                className="rounded-xl border border-border bg-surface p-5"
              >
                <p className="text-sm font-semibold text-foreground">{getCityName(city.cityId)}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-foreground-secondary">
                    {city.activityCount} activit{city.activityCount !== 1 ? "ies" : "y"}
                  </span>
                  {city.avgRating !== null && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-secondary">
                      <Star className="h-3 w-3 fill-brand-secondary" />
                      {city.avgRating}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Map */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6, ease }}
        className="mt-10"
      >
        <TripReviewMap tripId={tripId} />
      </motion.div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface p-4">
      {icon}
      <p className="mt-2 font-mono text-2xl font-bold text-foreground">
        <AnimatedCounter value={value} />
      </p>
      <p className="mt-1 text-xs text-stone">{label}</p>
    </div>
  );
}
