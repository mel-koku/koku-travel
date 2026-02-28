"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Share2 } from "lucide-react";
import { ItineraryShellB } from "@b/features/itinerary/ItineraryShellB";
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

type SharedClientBProps = {
  trip: SharedTripData;
  token: string;
};

const formatDateLabel = (iso: string | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
};

function SaveCopyButtonB({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleCopy = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      router.push(`/signin?redirect=/b/shared/${token}`);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/signin?redirect=/b/shared/${token}`);
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
      setTimeout(() => router.push("/b/dashboard"), 1000);
    } catch {
      setState("error");
    }
  }, [token, router]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={state === "loading" || state === "done"}
      className="inline-flex items-center rounded-xl border px-6 py-3 text-sm font-semibold transition hover:opacity-80 active:scale-[0.98] disabled:opacity-60"
      style={{ borderColor: "var(--border)", color: "var(--foreground)", backgroundColor: "var(--card)" }}
    >
      {state === "idle" && "Save a Copy"}
      {state === "loading" && "Saving\u2026"}
      {state === "done" && "Saved — redirecting"}
      {state === "error" && "Failed — try again"}
    </button>
  );
}

export function SharedClientB({ trip, token }: SharedClientBProps) {
  const itinerary = trip.itinerary as unknown as Itinerary;
  const builderData = trip.builderData as unknown as TripBuilderData;

  const createdLabel = formatDateLabel(trip.createdAt);
  const updatedLabel = formatDateLabel(trip.updatedAt);

  const tripStartDate = useMemo(() => {
    return builderData?.dates?.start ?? undefined;
  }, [builderData]);

  return (
    <div className="pt-[var(--header-h)]" style={{ backgroundColor: "var(--background)" }}>
      {/* Shared badge + trip name */}
      <div className="mx-auto max-w-screen-2xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: "var(--accent)", color: "var(--primary)" }}>
            <Share2 className="h-3.5 w-3.5" />
            Shared Itinerary
          </div>
          <span className="flex items-center gap-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
            <Eye className="h-3.5 w-3.5" />
            {trip.viewCount} {trip.viewCount === 1 ? "view" : "views"}
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl" style={{ color: "var(--foreground)" }}>
          {trip.name}
        </h1>
      </div>

      {/* Itinerary shell in read-only mode */}
      <ErrorBoundary>
        <ItineraryShellB
          tripId="shared"
          itinerary={itinerary}
          createdLabel={createdLabel}
          updatedLabel={updatedLabel}
          isUsingMock={true}
          isReadOnly={true}
          tripStartDate={tripStartDate}
          tripBuilderData={builderData}
        />
      </ErrorBoundary>

      {/* Footer CTA */}
      <div className="border-t py-12 sm:py-16" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
        <div className="mx-auto max-w-screen-2xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: "var(--foreground)" }}>
            Plan your own Japan trip
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm" style={{ color: "var(--muted-foreground)" }}>
            Build a personalized itinerary with curated locations, smart scheduling, and local insights.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/b/trip-builder"
              className="inline-flex items-center rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "var(--primary)" }}
            >
              Build My Trip
            </Link>
            <SaveCopyButtonB token={token} />
          </div>
        </div>
      </div>
    </div>
  );
}
