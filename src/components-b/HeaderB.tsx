"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuthState } from "@/components/ui/IdentityBadge";
import { createClient } from "@/lib/supabase/client";
import { useAppState } from "@/state/AppState";

const NAV_ITEMS = [
  { label: "Places", href: "/b/places" },
  { label: "Discover", href: "/b/discover" },
  { label: "Guides", href: "/b/guides" },
  { label: "Experiences", href: "/b/experiences" },
];

export function HeaderB() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAllLocalData } = useAppState();
  const { isSignedIn, isLoading: authLoading } = useAuthState();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Click-outside to close user menu
  useEffect(() => {
    if (!userMenuOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [userMenuOpen]);

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearAllLocalData();
    setUserMenuOpen(false);
    router.push("/b/");
  }, [clearAllLocalData, router]);

  const userInitial =
    user?.displayName && user.displayName !== "Guest"
      ? user.displayName.charAt(0).toUpperCase()
      : isSignedIn
        ? "U"
        : null;

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
            className="rounded-lg text-xl font-bold tracking-[-0.02em] text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
          >
            KOKU
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-4 md:flex lg:gap-8">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-lg py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[2px] after:origin-center after:scale-x-0 after:bg-[var(--primary)] after:transition-transform after:duration-200 hover:text-[var(--foreground)] hover:after:scale-x-100 ${
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
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-medium text-white shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-elevated)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
            >
              Plan a Trip
            </Link>

            {/* Desktop user menu */}
            {!authLoading && (
              <div ref={userMenuRef} className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-sm font-semibold text-[var(--primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
                  aria-label="User menu"
                >
                  {userInitial ?? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                  )}
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-[var(--border)] bg-white p-1 shadow-[var(--shadow-elevated)]">
                    <Link
                      href="/b/dashboard"
                      className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/b/saved"
                      className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Saved Places
                    </Link>
                    {isSignedIn && (
                      <Link
                        href="/b/account"
                        className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Account
                      </Link>
                    )}
                    <div className="my-1 border-t border-[var(--border)]" />
                    {isSignedIn ? (
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
                      >
                        Sign Out
                      </button>
                    ) : (
                      <Link
                        href="/b/signin"
                        className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-[var(--primary)] font-medium transition-colors hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Sign In
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 md:hidden"
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
        <div className="flex flex-col px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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

          {/* User items */}
          {!authLoading && (
            <>
              <div className="my-2 border-t border-[var(--border)]" />
              <Link
                href="/b/dashboard"
                onClick={() => setMenuOpen(false)}
                className={`relative border-b border-[var(--border)] py-4 text-base font-medium transition-colors ${
                  pathname.startsWith("/b/dashboard")
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] active:text-[var(--foreground)]"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/b/saved"
                onClick={() => setMenuOpen(false)}
                className={`relative border-b border-[var(--border)] py-4 text-base font-medium transition-colors ${
                  pathname.startsWith("/b/saved")
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] active:text-[var(--foreground)]"
                }`}
              >
                Saved Places
              </Link>
              {isSignedIn ? (
                <>
                  <Link
                    href="/b/account"
                    onClick={() => setMenuOpen(false)}
                    className={`relative border-b border-[var(--border)] py-4 text-base font-medium transition-colors ${
                      pathname.startsWith("/b/account")
                        ? "text-[var(--primary)]"
                        : "text-[var(--muted-foreground)] active:text-[var(--foreground)]"
                    }`}
                  >
                    Account
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      handleSignOut();
                    }}
                    className="py-4 text-left text-base font-medium text-[var(--muted-foreground)] transition-colors active:text-[var(--foreground)]"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/b/signin"
                  onClick={() => setMenuOpen(false)}
                  className="py-4 text-base font-medium text-[var(--primary)] transition-colors"
                >
                  Sign In
                </Link>
              )}
            </>
          )}
        </div>
      </nav>
    </>
  );
}
