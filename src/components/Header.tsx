"use client";

import Link from "next/link";

import IdentityBadge from "@/components/ui/IdentityBadge";
import { useAppState } from "@/state/AppState";

const navItems = [
  { label: "Explore", href: "/explore" },
  { label: "Guides", href: "/guides" },
  { label: "Community", href: "/community" },
  { label: "Trip Builder", href: "/trip-builder" },
];

export default function Header() {
  const { user, setUser } = useAppState();

  const handleLocaleChange = (locale: "en" | "jp") => {
    if (user.locale === locale) return;
    setUser({ locale });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-red-500 text-sm uppercase tracking-wider text-red-500">
            K
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-semibold">Koku Travel</span>
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Japan Planner
            </span>
          </div>
        </div>

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

        <div className="flex items-center gap-6">
          <div className="hidden items-center rounded-full border border-zinc-200 bg-white p-1 text-xs font-semibold uppercase tracking-wide shadow-sm dark:border-zinc-700 dark:bg-zinc-900 md:flex">
            <button
              type="button"
              onClick={() => handleLocaleChange("en")}
              className={`rounded-full px-4 py-2 transition-colors ${
                user.locale === "en"
                  ? "bg-red-500 text-white shadow-sm"
                  : "hover:text-red-500"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => handleLocaleChange("jp")}
              className={`rounded-full px-4 py-2 transition-colors ${
                user.locale === "jp"
                  ? "bg-red-500 text-white shadow-sm"
                  : "hover:text-red-500"
              }`}
            >
              JP
            </button>
          </div>
          <Link
            href="/dashboard"
            className="hidden rounded-full border border-red-500 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-red-500 transition-colors hover:bg-red-500 hover:text-white md:inline-flex"
          >
            Dashboard
          </Link>
          <Link href="/account" className="flex items-center">
            <IdentityBadge className="hidden md:inline-flex" />
            <span className="inline-flex md:hidden">
              <span className="rounded-full border border-red-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-500">
                Account
              </span>
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
