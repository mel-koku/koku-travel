"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import IdentityBadge from "@/components/ui/IdentityBadge";
import { cn } from "@/lib/cn";

const navItems = [
  { label: "Explore", href: "/explore" },
  { label: "Guides", href: "/guides" },
  // { label: "Community", href: "/community" }, // Hidden for future development
  { label: "Trip Builder", href: "/trip-builder" },
];

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);

  // Close mobile menu when route changes
  // Use ref to track pathname changes and schedule update outside effect
  useEffect(() => {
    if (prevPathnameRef.current !== pathname && isMobileMenuOpen) {
      prevPathnameRef.current = pathname;
      // Schedule state update outside of effect execution using requestAnimationFrame
      const frameId = requestAnimationFrame(() => {
        setIsMobileMenuOpen(false);
      });
      return () => {
        cancelAnimationFrame(frameId);
      };
    } else {
      prevPathnameRef.current = pathname;
    }
  }, [pathname, isMobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 sm:px-6 md:px-8">
        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-dashed border-red-500 text-sm uppercase tracking-wider text-red-500">
            K
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-semibold">Koku Travel</span>
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-zinc-500">
              Japan Planner
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium uppercase tracking-wide md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              className="transition-colors hover:text-red-500"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/dashboard"
            className="hidden rounded-full border border-red-500 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-red-500 transition-colors hover:bg-red-500 hover:text-white md:inline-flex"
          >
            Dashboard
          </Link>
          <Link href="/account" className="flex items-center">
            <IdentityBadge className="hidden md:inline-flex" />
            <span className="inline-flex md:hidden">
              <span className="rounded-full border border-red-500 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold uppercase tracking-wide text-red-500">
                Account
              </span>
            </span>
          </Link>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 md:hidden"
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      <>
        <div
          className={cn(
            "fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300 ease-out md:hidden",
            isMobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
        <nav
          className={cn(
            "fixed inset-y-0 right-0 z-[70] w-full max-w-xs sm:max-w-sm bg-white shadow-xl transition-transform duration-300 ease-out md:hidden overflow-y-auto scroll-smooth",
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
          )}
          aria-label="Mobile navigation"
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-zinc-200 p-5 sm:p-6">
              <Link href="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-red-500 text-sm uppercase tracking-wider text-red-500">
                  K
                </div>
                <span className="text-lg font-semibold text-gray-900">Koku Travel</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-700 transition-colors hover:bg-zinc-100"
                aria-label="Close menu"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scroll-smooth p-5 sm:p-6">
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "rounded-lg px-4 py-4 text-base font-medium text-gray-900 transition-colors hover:bg-zinc-100",
                      pathname === item.href && "bg-red-50 text-red-600"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

                <div className="mt-6 border-t border-zinc-200 pt-6">
                  <Link
                    href="/dashboard"
                    className="block rounded-lg px-4 py-3 text-base font-medium text-gray-900 transition-colors hover:bg-zinc-100"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/account"
                    className="mt-2 block rounded-lg px-4 py-3 text-base font-medium text-gray-900 transition-colors hover:bg-zinc-100"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Account
                  </Link>
                </div>
              </div>
            </div>
          </nav>
        </>
    </header>
  );
}
