import Link from "next/link";

export default function SharedNotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4">
      <div className="text-center">
        <Link href="/" className="font-serif italic text-2xl text-foreground hover:text-brand-primary transition">
          KOKU
        </Link>
        <h1 className="mt-8 font-serif italic text-3xl text-foreground sm:text-4xl">
          Link no longer active
        </h1>
        <p className="mt-3 max-w-sm text-sm text-foreground-secondary">
          This link has expired or been turned off.
        </p>
        <Link
          href="/trip-builder"
          className="mt-8 inline-flex items-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-primary/90 hover:shadow-xl active:scale-[0.98]"
        >
          Plan your own trip
        </Link>
      </div>
    </div>
  );
}
