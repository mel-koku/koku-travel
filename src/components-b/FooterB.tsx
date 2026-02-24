"use client";

import Link from "next/link";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { label: "Places", href: "/b/places" },
      { label: "Guides", href: "/b/guides" },
      { label: "Experiences", href: "/b/experiences" },
      { label: "Discover", href: "/b/discover" },
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
              className="text-lg font-bold tracking-[-0.02em] text-[var(--foreground)]"
            >
              KOKU
            </Link>
            <p className="mt-2 max-w-xs text-sm text-[var(--muted-foreground)]">
              Curated Japan travel guides, itineraries, and experiences from
              local experts.
            </p>
          </div>

          {/* Nav columns */}
          <div className="flex gap-16">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  {col.title}
                </p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-[var(--foreground-body)] transition-colors hover:text-[var(--foreground)]"
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
