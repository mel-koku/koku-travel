"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { label: "Places", href: "/b/places" },
  { label: "Guides", href: "/b/guides" },
  { label: "Experiences", href: "/b/experiences" },
];

export function HeaderB() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300"
        style={{
          height: "var(--header-h)",
          backgroundColor: "#fff",
          boxShadow: scrolled ? "var(--shadow-sm)" : "none",
        }}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/b/"
            className="text-xl font-bold tracking-[-0.02em] text-[var(--foreground)]"
          >
            KOKU
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative py-1 text-sm font-medium transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[2px] after:origin-center after:scale-x-0 after:bg-[var(--primary)] after:transition-transform after:duration-200 hover:text-[var(--foreground)] hover:after:scale-x-100 ${
                    isActive
                      ? "text-[var(--foreground)] after:scale-x-100"
                      : "text-[var(--muted-foreground)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {/* CTA */}
            <Link
              href="/b/trip-builder"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-medium text-white shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-elevated)] active:scale-[0.98]"
            >
              Plan a Trip
            </Link>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] md:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {menuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="17" x2="20" y2="17" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-charcoal/40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile menu panel */}
      <nav
        className={`fixed inset-x-0 z-40 bg-white transition-transform duration-300 ease-out md:hidden ${
          menuOpen ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{
          top: "var(--header-h)",
          boxShadow: menuOpen ? "var(--shadow-elevated)" : "none",
        }}
      >
        <div className="flex flex-col px-6 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`relative border-b border-[var(--border)] py-4 text-base font-medium transition-colors ${
                  isActive
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] active:text-[var(--foreground)]"
                }`}
              >
                <span className="flex items-center justify-between">
                  {item.label}
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
