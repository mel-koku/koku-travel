"use client";

import Link from "next/link";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { label: "Places", href: "/b/places" },
      { label: "Guides", href: "/b/guides" },
      { label: "Local Experts", href: "/b/local-experts" },
    ],
  },
  {
    title: "Plan",
    links: [
      { label: "Trip Builder", href: "/b/trip-builder" },
      { label: "Dashboard", href: "/b/dashboard" },
      { label: "Saved", href: "/b/saved" },
      { label: "Account", href: "/b/account" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/b/about" },
      { label: "Contact", href: "/b/contact" },
      { label: "Privacy", href: "/b/privacy" },
    ],
  },
];

export function FooterB() {
  return (
    <footer className="border-t border-[var(--border)] bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          {/* Brand */}
          <div>
            <Link
              href="/b/"
              className="rounded-lg text-lg font-bold tracking-[-0.02em] text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
            >
              KOKU
            </Link>
            <p className="mt-2 max-w-xs text-sm text-[var(--muted-foreground)]">
              Curated Japan travel guides, itineraries, and experiences from
              local experts.
            </p>
          </div>

          {/* Nav columns */}
          <div className="flex flex-wrap gap-8 sm:gap-12 lg:gap-16">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                  {col.title}
                </p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="rounded-lg text-sm text-[var(--foreground-body)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 border-t border-[var(--border)] pt-6">
          <p className="text-xs text-[var(--muted-foreground)]">
            &copy; {new Date().getFullYear()} Koku Travel. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
