import Link from "next/link";

export const metadata = {
  title: "Travel Guides - Coming Soon | Koku Travel",
  description: "Expert travel guides for Japan are coming soon. Stay tuned for curated content from local experts.",
};

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-surface pt-8 pb-16">
      <div className="mx-auto max-w-2xl px-4 text-center">
        <div className="rounded-2xl border border-border bg-background p-8 shadow-sm sm:p-12">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-sage/10">
            <svg
              className="h-8 w-8 text-sage"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h1 className="mb-4 text-3xl font-bold text-charcoal">
            Travel Guides Coming Soon
          </h1>
          <p className="mb-8 text-lg text-foreground-secondary">
            We&apos;re working on curated travel guides from local experts to help you
            discover the best of Japan. Check back soon for insider tips, hidden gems,
            and authentic experiences.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-6 py-3 text-base font-medium text-white shadow-sm transition hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
          >
            Start Planning Your Trip
          </Link>
        </div>
      </div>
    </div>
  );
}
