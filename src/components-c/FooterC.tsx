"use client";

import Link from "next/link";

const COL_1 = [
  { label: "Places", href: "/c/places" },
  { label: "Guides", href: "/c/guides" },
  { label: "Experiences", href: "/c/experiences" },
  { label: "Local Experts", href: "/c/local-experts" },
];

const COL_2 = [
  { label: "Trip Builder", href: "/c/trip-builder" },
  { label: "Dashboard", href: "/c/dashboard" },
  { label: "Saved", href: "/c/saved" },
];

const COL_3 = [
  { label: "About", href: "/c/about" },
  { label: "Contact", href: "/c/contact" },
  { label: "Privacy", href: "/c/privacy" },
];

export function FooterC() {
  return (
    <footer className="border-t border-[var(--border)]" style={{ backgroundColor: "var(--background)" }}>
      <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10 lg:py-24">
        {/* Grid: 12-col, asymmetric — logo takes 4, nav columns take 2 each */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-12 lg:gap-4">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-4">
            <p
              className="text-lg font-extrabold uppercase tracking-[0.1em] text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}
            >
              KOKU
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--muted-foreground)]">
              Plan your trip to Japan with places we would actually recommend.
            </p>
          </div>

          {/* Explore */}
          <div className="lg:col-span-2 lg:col-start-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Explore
            </p>
            <ul className="mt-4 space-y-3">
              {COL_1.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-[var(--foreground)] transition-opacity hover:opacity-60"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Plan */}
          <div className="lg:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Plan
            </p>
            <ul className="mt-4 space-y-3">
              {COL_2.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-[var(--foreground)] transition-opacity hover:opacity-60"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="lg:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Company
            </p>
            <ul className="mt-4 space-y-3">
              {COL_3.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-[var(--foreground)] transition-opacity hover:opacity-60"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom rule + copyright */}
        <div className="mt-16 border-t border-[var(--border)] pt-8 lg:mt-24">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            &copy; {new Date().getFullYear()} Koku Travel
          </p>
        </div>
      </div>
    </footer>
  );
}
