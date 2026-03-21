"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Share2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { createClient } from "@/lib/supabase/client";
import type { Itinerary } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";

type SharedTripData = {
  name: string;
  itinerary: Record<string, unknown>;
  builderData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  shareCreatedAt: string;
  viewCount: number;
};

type SharedClientCProps = {
  trip: SharedTripData;
  token: string;
};

const formatDateLabel = (iso: string | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
};

function SaveCopyButtonC({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleCopy = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      router.push(`/c/signin?redirect=/c/shared/${token}`);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/c/signin?redirect=/c/shared/${token}`);
      return;
    }

    setState("loading");
    try {
      const res = await fetch(`/api/shared/${token}/copy`, { method: "POST" });
      if (!res.ok) {
        setState("error");
        return;
      }
      setState("done");
      setTimeout(() => router.push("/c/dashboard"), 1000);
    } catch {
      setState("error");
    }
  }, [token, router]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={state === "loading" || state === "done"}
      className="inline-flex h-11 items-center border border-[var(--foreground)] px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--foreground)] transition-colors hover:bg-[var(--foreground)] hover:text-[var(--background)] active:scale-[0.98] disabled:opacity-60"
    >
      {state === "idle" && "Save a Copy"}
      {state === "loading" && "Saving..."}
      {state === "done" && "Saved"}
      {state === "error" && "Failed. Try again"}
    </button>
  );
}

export function SharedClientC({ trip, token }: SharedClientCProps) {
  const itinerary = trip.itinerary as unknown as Itinerary;
  const builderData = trip.builderData as unknown as TripBuilderData;

  const createdLabel = formatDateLabel(trip.createdAt);
  const updatedLabel = formatDateLabel(trip.updatedAt);

  const tripStartDate = useMemo(() => {
    return builderData?.dates?.start ?? undefined;
  }, [builderData]);

  // Lazy-load ItineraryShellC to avoid circular dependency issues during build
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ShellComponent, setShellComponent] = useState<React.ComponentType<any> | null>(null);

  useMemo(() => {
    import("@c/features/itinerary/ItineraryShellC").then((mod) => {
      setShellComponent(() => mod.ItineraryShellC);
    }).catch(() => {
      // ItineraryShellC may not be built yet - graceful fallback
    });
  }, []);

  return (
    <div className="pt-[var(--header-h)]" style={{ backgroundColor: "var(--background)" }}>
      {/* Shared badge + trip name */}
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 pt-8">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)" }}
          >
            <Share2 className="h-3.5 w-3.5" />
            Shared Itinerary
          </div>
          <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
            <Eye className="h-3.5 w-3.5" />
            {trip.viewCount} {trip.viewCount === 1 ? "view" : "views"}
          </span>
        </div>
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
          {trip.name}
        </h1>
      </div>

      {/* Itinerary shell in read-only mode */}
      <ErrorBoundary>
        {ShellComponent ? (
          <ShellComponent
            tripId="shared"
            itinerary={itinerary}
            createdLabel={createdLabel}
            updatedLabel={updatedLabel}
            isUsingMock={true}
            isReadOnly={true}
            tripStartDate={tripStartDate}
            tripBuilderData={builderData}
          />
        ) : (
          <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-16">
            <p className="text-sm text-[var(--muted-foreground)]">Loading itinerary...</p>
          </div>
        )}
      </ErrorBoundary>

      {/* Footer CTA */}
      <div
        className="border-t border-[var(--border)] py-24 sm:py-32"
        style={{ backgroundColor: "var(--surface)" }}
      >
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            Start planning
          </p>
          <h2
            className="mt-4 leading-[1.1]"
            style={{
              fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
              fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--foreground)",
            }}
          >
            Plan your own Japan trip
          </h2>
          <p className="mt-3 max-w-md text-sm text-[var(--muted-foreground)]">
            Build a personalized itinerary with curated locations, smart scheduling, and local insights.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/c/trip-builder"
              className="inline-flex h-11 items-center justify-center bg-[var(--primary)] px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              Build My Trip
            </Link>
            <SaveCopyButtonC token={token} />
          </div>
        </div>
      </div>
    </div>
  );
}
