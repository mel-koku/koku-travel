"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ItineraryShell } from "@/components/features/itinerary/ItineraryShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { createClient } from "@/lib/supabase/client";
import type { Itinerary } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";

type SharedTripData = {
  name: string;
  itinerary: Itinerary;
  builderData: TripBuilderData;
  createdAt: string;
  updatedAt: string;
  shareCreatedAt: string;
  viewCount: number;
};

type SharedClientProps = {
  trip: SharedTripData;
  token: string;
};

const formatDateLabel = (iso: string | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
};

function SaveCopyButton({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleCopy = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      router.push(`/signin?redirect=/shared/${token}`);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/signin?redirect=/shared/${token}`);
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
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch {
      setState("error");
    }
  }, [token, router]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={state === "loading" || state === "done"}
      className="inline-flex items-center rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-surface/80 active:scale-[0.98] disabled:opacity-60"
    >
      {state === "idle" && "Save a Copy"}
      {state === "loading" && "Saving\u2026"}
      {state === "done" && "Saved — redirecting"}
      {state === "error" && "Failed — try again"}
    </button>
  );
}

export function SharedClient({ trip, token }: SharedClientProps) {
  const itinerary = trip.itinerary;
  const builderData = trip.builderData;

  const createdLabel = formatDateLabel(trip.createdAt);
  const updatedLabel = formatDateLabel(trip.updatedAt);

  const tripStartDate = useMemo(() => {
    return builderData?.dates?.start ?? undefined;
  }, [builderData]);

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Minimal branded header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-serif italic text-xl text-foreground hover:text-brand-primary transition">
              KOKU
            </Link>
            <span className="text-stone">|</span>
            <span className="text-sm text-foreground-secondary">Shared Itinerary</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-mono text-xs text-stone">
              {trip.viewCount} {trip.viewCount === 1 ? "view" : "views"}
            </span>
          </div>
        </div>
      </header>

      {/* Trip name */}
      <div className="mx-auto max-w-screen-2xl px-4 pt-6 sm:px-6">
        <h1 className="font-serif italic text-3xl text-foreground sm:text-4xl">
          {trip.name}
        </h1>
      </div>

      {/* Itinerary shell in read-only mode */}
      <ErrorBoundary>
        <ItineraryShell
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
      <div className="border-t border-border bg-canvas py-12 sm:py-16">
        <div className="mx-auto max-w-screen-2xl px-4 text-center sm:px-6">
          <h2 className="font-serif italic text-2xl text-foreground sm:text-3xl">
            Plan your own Japan trip
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-foreground-secondary">
            Liked what you saw? Build your own.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/trip-builder"
              className="inline-flex items-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-primary/90 hover:shadow-xl active:scale-[0.98]"
            >
              Build My Trip
            </Link>
            <SaveCopyButton token={token} />
          </div>
        </div>
      </div>
    </div>
  );
}
