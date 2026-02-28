"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useInView } from "framer-motion";
import { MapPin, Star, Calendar, Compass, ArrowLeft } from "lucide-react";
import { REGIONS } from "@/data/regions";

const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

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

// Lazy-load map (shared component)
const TripReviewMap = dynamic(
  () => import("@/components/features/dashboard/TripReviewMap").then((m) => m.TripReviewMap),
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
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className="h-4 w-4"
          style={{
            fill: star <= rating ? "var(--warning)" : "transparent",
            color: star <= rating ? "var(--warning)" : "var(--muted-foreground)",
            opacity: star <= rating ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  );
}

export function TripReviewB({ tripId }: { tripId: string }) {
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
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="text-[var(--muted-foreground)]">{error ?? "Trip summary not available."}</p>
        <Link href="/b/dashboard" className="mt-4 inline-block text-sm font-medium text-[var(--primary)] hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href="/b/dashboard"
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: bEase }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
          Your Japan Journey
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-4xl">
          {data.tripName}
        </h1>
        {cityNames.length > 0 && (
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {cityNames.join(" · ")}
          </p>
        )}
      </motion.div>

      {/* Stats grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: bEase }}
        className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4"
      >
        <StatCardB icon={<Calendar className="h-5 w-5" style={{ color: "var(--primary)" }} />} label="Days" value={data.totalDays} />
        <StatCardB icon={<MapPin className="h-5 w-5" style={{ color: "var(--primary)" }} />} label="Cities" value={data.cities.length} />
        <StatCardB icon={<Compass className="h-5 w-5" style={{ color: "var(--primary)" }} />} label="Activities" value={data.totalActivities} />
        {data.avgRating !== null && (
          <div
            className="flex flex-col items-center justify-center rounded-2xl p-4"
            style={{
              backgroundColor: "var(--card)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <Star className="h-5 w-5" style={{ color: "var(--warning)" }} />
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{data.avgRating}</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">Avg rating</p>
          </div>
        )}
      </motion.div>

      {/* Top rated highlights */}
      {data.topRated.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: bEase }}
          className="mt-10"
        >
          <h2 className="text-xl font-bold text-[var(--foreground)]">Highlights</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Your top-rated experiences</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {data.topRated.map((item, i) => (
              <motion.div
                key={item.activityId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.1, ease: bEase }}
                className="rounded-2xl p-5"
                style={{
                  backgroundColor: "var(--card)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--muted-foreground)]">#{i + 1}</span>
                  <StarRating rating={item.rating} />
                </div>
                <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* City breakdown */}
      {data.perCity.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45, ease: bEase }}
          className="mt-10"
        >
          <h2 className="text-xl font-bold text-[var(--foreground)]">By City</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.perCity.map((city) => (
              <div
                key={city.cityId}
                className="rounded-2xl p-5"
                style={{
                  backgroundColor: "var(--card)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <p className="text-sm font-semibold text-[var(--foreground)]">{getCityName(city.cityId)}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {city.activityCount} activit{city.activityCount !== 1 ? "ies" : "y"}
                  </span>
                  {city.avgRating !== null && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "var(--warning)" }}>
                      <Star className="h-3 w-3" style={{ fill: "var(--warning)" }} />
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6, ease: bEase }}
        className="mt-10"
      >
        <TripReviewMap tripId={tripId} />
      </motion.div>
    </div>
  );
}

function StatCardB({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl p-4"
      style={{
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {icon}
      <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
        <AnimatedCounter value={value} />
      </p>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{label}</p>
    </div>
  );
}
