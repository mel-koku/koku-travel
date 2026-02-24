import Link from "next/link";

export default function SharedNotFoundB() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4 pt-[var(--header-h)]">
      <div className="text-center">
        <h1 className="text-3xl font-bold sm:text-4xl" style={{ color: "var(--foreground)" }}>
          Link no longer active
        </h1>
        <p className="mt-3 max-w-sm text-sm" style={{ color: "var(--muted-foreground)" }}>
          This itinerary link has expired or been deactivated by the owner.
        </p>
        <Link
          href="/b/trip-builder"
          className="mt-8 inline-flex items-center rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: "var(--primary)" }}
        >
          Plan your own trip
        </Link>
      </div>
    </div>
  );
}
