import Link from "next/link";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/cn";

export default function SharedNotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4">
      <div className="text-center">
        <Link href="/" className="font-serif text-2xl text-foreground hover:text-brand-primary transition">
          KOKU
        </Link>
        <h1 className={cn(typography({ intent: "editorial-h1" }), "mt-8")}>
          Link no longer active
        </h1>
        <p className="mt-3 max-w-sm text-sm text-foreground-secondary">
          This link has expired or been turned off.
        </p>
        <Link
          href="/trip-builder"
          className="mt-8 inline-flex items-center rounded-lg bg-brand-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-primary/90 hover:shadow-xl active:scale-[0.98]"
        >
          Plan your own trip
        </Link>
      </div>
    </div>
  );
}
