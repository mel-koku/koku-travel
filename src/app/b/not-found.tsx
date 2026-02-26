import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found | Koku Travel",
};

export default function VariantBNotFound() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-6">
      <div className="text-center" style={{ maxWidth: "28rem" }}>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Page not found
        </p>
        <h1 className="mt-6 text-[clamp(2rem,6vw,3.5rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--foreground)]">
          Wrong Turn
        </h1>
        <p className="mt-4 text-[var(--foreground-body)]">
          This path leads nowhere — but Japan still has thousands waiting for
          you.
        </p>
        <Link
          href="/b/"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-[var(--primary)] px-8 text-sm font-medium text-white shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]"
        >
          Take Me Home
        </Link>
      </div>
    </div>
  );
}
