"use client";

import Link from "next/link";
import { Magnetic } from "@/components/ui/Magnetic";

const exploreLinks = [
  { label: "Locations", href: "/explore" },
  { label: "Guides", href: "/guides" },
  { label: "Trip Builder", href: "/trip-builder" },
];

const accountLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Favorites", href: "/favorites" },
  { label: "Settings", href: "/account" },
];

const companyLinks = [
  { label: "About", href: "#" },
  { label: "Contact", href: "#" },
  { label: "Privacy", href: "#" },
];

const socialIcons = [
  { label: "IG", href: "#" },
  { label: "X", href: "#" },
  { label: "YT", href: "#" },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-charcoal text-white border-t border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
        {/* Top: Brand + Navigation */}
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">
          {/* Brand Column */}
          <div className="lg:col-span-5">
            <h3 className="font-serif italic text-3xl sm:text-4xl">Koku Travel</h3>
            <p className="mt-4 max-w-md text-base text-white/60">
              Curated by people who know Japan from the inside.
            </p>

            {/* Newsletter */}
            <div className="mt-8">
              <label className="text-xs uppercase tracking-[0.3em] text-white/40">
                Get the inside track
              </label>
              <div className="mt-3 flex gap-2">
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/20"
                />
                <Magnetic>
                  <button
                    type="button"
                    className="rounded-xl bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primary/90"
                  >
                    Sign me up
                  </button>
                </Magnetic>
              </div>
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="grid grid-cols-2 gap-8 lg:col-span-7 lg:grid-cols-3">
            <NavColumn title="Explore" links={exploreLinks} />
            <NavColumn title="Account" links={accountLinks} />
            <NavColumn title="Company" links={companyLinks} />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-xs text-white/40">
            &copy; {currentYear} Koku Travel. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            {socialIcons.map((icon) => (
              <a
                key={icon.label}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-white/20 text-xs font-semibold uppercase tracking-[0.3em] text-white/60 transition-colors hover:border-white/40 hover:text-white"
                href={icon.href}
                aria-label={icon.label}
              >
                {icon.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function NavColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-white/40">{title}</p>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm text-white/70 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
