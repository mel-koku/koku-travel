"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useReducedMotion, useInView } from "framer-motion";
import { MapPin, Star, Calendar, Compass, ArrowLeft } from "lucide-react";
import { REGIONS } from "@/data/regions";
import { cEase } from "@c/ui/motionC";

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

export function TripReviewC({ tripId }: { tripId: string }) {
  const noMotion = !!useReducedMotion();
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
        <div className="h-8 w-8 animate-spin border-2 border-t-transparent" style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-20">
        <p className="text-[var(--muted-foreground)]">{error ?? "Trip summary not available."}</p>
        <Link href="/c/dashboard" className="mt-4 inline-block text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--primary)] hover:opacity-70">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-24 sm:py-32">
      <Link
        href="/c/dashboard"
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <motion.div
        initial={noMotion ? undefined : { opacity: 0, y: 16 }}
        animate={noMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: cEase }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Your Japan Journey
        </p>
        <h1
          className="mt-4 leading-[1.1]"
          style={{
            fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
            fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--foreground)",
          }}
        >
          {data.tripName}
        </h1>
        {cityNames.length > 0 && (
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            {cityNames.join(" · ")}
          </p>
        )}
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={noMotion ? undefined : { opacity: 0, y: 16 }}
        animate={noMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: cEase }}
        className="mt-12 grid grid-cols-2 gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4"
      >
        {[
          { icon: <Calendar className="h-5 w-5" style={{ color: "var(--primary)" }} />, label: "Days", value: data.totalDays },
          { icon: <MapPin className="h-5 w-5" style={{ color: "var(--primary)" }} />, label: "Cities", value: data.cities.length },
          { icon: <Compass className="h-5 w-5" style={{ color: "var(--primary)" }} />, label: "Activities", value: data.totalActivities },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col items-center justify-center bg-[var(--background)] p-6">
            {stat.icon}
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
              <AnimatedCounter value={stat.value} />
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">{stat.label}</p>
          </div>
        ))}
        {data.avgRating !== null && (
          <div className="flex flex-col items-center justify-center bg-[var(--background)] p-6">
            <Star className="h-5 w-5" style={{ color: "var(--warning)" }} />
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{data.avgRating}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Avg rating</p>
          </div>
        )}
      </motion.div>

      {/* Top rated */}
      {data.topRated.length > 0 && (
        <motion.div
          initial={noMotion ? undefined : { opacity: 0, y: 16 }}
          animate={noMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: cEase }}
          className="mt-16"
        >
          <h2 className="text-xl font-bold text-[var(--foreground)]">Highlights</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Your top-rated experiences</p>
          <div className="mt-6 grid gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
            {data.topRated.map((item, i) => (
              <motion.div
                key={item.activityId}
                initial={noMotion ? undefined : { opacity: 0, y: 8 }}
                animate={noMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.1, ease: cEase }}
                className="bg-[var(--background)] p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--muted-foreground)]">#{i + 1}</span>
                  <StarRating rating={item.rating} />
                </div>
                <p className="mt-3 text-sm font-bold text-[var(--foreground)]">{item.title}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* City breakdown */}
      {data.perCity.length > 1 && (
        <motion.div
          initial={noMotion ? undefined : { opacity: 0, y: 16 }}
          animate={noMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45, ease: cEase }}
          className="mt-16"
        >
          <h2 className="text-xl font-bold text-[var(--foreground)]">By City</h2>
          <div className="mt-6 grid gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
            {data.perCity.map((city) => (
              <div key={city.cityId} className="bg-[var(--background)] p-5">
                <p className="text-sm font-bold text-[var(--foreground)]">{getCityName(city.cityId)}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {city.activityCount} activit{city.activityCount !== 1 ? "ies" : "y"}
                  </span>
                  {city.avgRating !== null && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: "var(--warning)" }}>
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
        initial={noMotion ? undefined : { opacity: 0, y: 16 }}
        animate={noMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6, ease: cEase }}
        className="mt-16"
      >
        <TripReviewMap tripId={tripId} />
      </motion.div>
    </div>
  );
}
