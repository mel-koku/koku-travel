"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { label: "Overview", path: "/ui" },
  { label: "Colors", path: "/ui/colors" },
  { label: "Typography", path: "/ui/typography" },
  { label: "Motion", path: "/ui/motion" },
  { label: "Components", path: "/ui/components" },
  { label: "Cards", path: "/ui/cards" },
  { label: "Layout", path: "/ui/layout" },
  { label: "Overlays", path: "/ui/overlays" },
];

export default function UILayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) =>
    path === "/ui" ? pathname === "/ui" : pathname.startsWith(path);

  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-[100dvh] w-56 shrink-0 border-r border-border bg-surface lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-5 py-5">
            <Link href="/" className="flex items-baseline gap-1.5">
              <span className="font-serif text-lg italic text-foreground">
                Koku
              </span>
              <span className="text-[10px] font-light uppercase tracking-[0.3em] text-foreground-secondary">
                Travel
              </span>
            </Link>
            <p className="mt-1 text-xs text-stone">Design System</p>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="flex flex-col gap-0.5">
              {navItems.map(({ label, path }) => (
                <li key={path}>
                  <Link
                    href={path}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive(path)
                        ? "bg-surface text-foreground font-medium ring-1 ring-border"
                        : "text-foreground-secondary hover:bg-surface hover:text-foreground"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-baseline gap-1.5">
            <span className="font-serif text-lg italic text-foreground">
              Koku
            </span>
            <span className="text-[10px] font-light uppercase tracking-[0.3em] text-foreground-secondary">
              Travel
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground-secondary hover:bg-background hover:text-foreground"
            aria-label="Toggle navigation"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
        {mobileOpen && (
          <nav className="border-t border-border px-4 pb-4 pt-2">
            <ul className="flex flex-wrap gap-1.5">
              {navItems.map(({ label, path }) => (
                <li key={path}>
                  <Link
                    href={path}
                    onClick={() => setMobileOpen(false)}
                    className={`inline-block rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      isActive(path)
                        ? "bg-background text-foreground font-medium ring-1 ring-border"
                        : "text-foreground-secondary hover:bg-background hover:text-foreground"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
