"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuthState } from "@/components/ui/IdentityBadge";
import { VariantToggle } from "@/components/ui/VariantToggle";
import { createClient } from "@/lib/supabase/client";
import { useAppState } from "@/state/AppState";

const NAV_ITEMS = [
  { label: "Places", href: "/c/places" },
  { label: "Guides", href: "/c/guides" },
  { label: "Experts", href: "/c/local-experts" },
];

export function HeaderC() {
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

  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

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
    router.push("/c/");
  }, [clearAllLocalData, router]);

  const userInitial =
    user?.displayName && user.displayName !== "Guest"
      ? user.displayName.charAt(0).toUpperCase()
      : isSignedIn
        ? "U"
        : null;

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
        className="fixed inset-x-0 top-0 z-50 transition-[border-color] duration-300"
        style={{
          height: "var(--header-h)",
          backgroundColor: "var(--background)",
          borderBottom: `1px solid ${scrolled ? "var(--border)" : "transparent"}`,
        }}
      >
        <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-6 lg:px-10">
          {/* Logo: Syne display, tight tracking, uppercase */}
          <Link
            href="/c/"
            className="text-lg font-extrabold uppercase tracking-[0.1em] text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            style={{ fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}
          >
            KOKU
          </Link>

          {/* Desktop Nav: uppercase, small, wide tracking */}
          <nav className="hidden items-center gap-10 md:flex">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-[11px] font-medium uppercase tracking-[0.15em] transition-colors duration-200 hover:text-[var(--foreground)] ${
                    isActive
                      ? "text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <VariantToggle />

            {/* CTA: sharp corners, vermillion, uppercase */}
            <Link
              href="/c/trip-builder"
              className="hidden h-10 items-center justify-center bg-[var(--primary)] px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-opacity duration-200 hover:opacity-90 active:scale-[0.98] sm:inline-flex"
            >
              Plan a Trip
            </Link>

            {/* Desktop user menu */}
            {!authLoading && (
              <div ref={userMenuRef} className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex h-8 w-8 items-center justify-center border border-[var(--border)] text-xs font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
                  aria-label="User menu"
                >
                  {userInitial ?? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                  )}
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 border border-[var(--border)] bg-white p-1">
                    <Link
                      href="/c/dashboard"
                      className="flex w-full items-center px-3 py-2 text-xs uppercase tracking-[0.1em] text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/c/saved"
                      className="flex w-full items-center px-3 py-2 text-xs uppercase tracking-[0.1em] text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Saved Places
                    </Link>
                    {isSignedIn && (
                      <Link
                        href="/c/account"
                        className="flex w-full items-center px-3 py-2 text-xs uppercase tracking-[0.1em] text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
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
                        className="flex w-full items-center px-3 py-2 text-xs uppercase tracking-[0.1em] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                      >
                        Sign Out
                      </button>
                    ) : (
                      <Link
                        href="/c/signin"
                        className="flex w-full items-center px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--primary)] transition-colors hover:bg-[var(--muted)]"
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
              className="flex h-11 w-11 items-center justify-center text-[var(--foreground)] md:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                {menuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="17" x2="20" y2="17" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[var(--foreground)]/40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile menu: full-width, sharp, minimal */}
      <nav
        className={`fixed inset-x-0 z-40 border-b border-[var(--border)] bg-[var(--background)] transition-transform duration-300 md:hidden ${
          menuOpen ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{ top: "var(--header-h)" }}
      >
        <div className="flex flex-col px-6 py-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`border-b border-[var(--border)] py-4 text-xs font-medium uppercase tracking-[0.15em] transition-colors ${
                  isActive
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-foreground)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          {!authLoading && (
            <>
              <div className="my-1" />
              <Link
                href="/c/dashboard"
                onClick={() => setMenuOpen(false)}
                className="border-b border-[var(--border)] py-4 text-xs font-medium uppercase tracking-[0.15em] text-[var(--muted-foreground)]"
              >
                Dashboard
              </Link>
              <Link
                href="/c/saved"
                onClick={() => setMenuOpen(false)}
                className="border-b border-[var(--border)] py-4 text-xs font-medium uppercase tracking-[0.15em] text-[var(--muted-foreground)]"
              >
                Saved
              </Link>
              {isSignedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    handleSignOut();
                  }}
                  className="py-4 text-left text-xs font-medium uppercase tracking-[0.15em] text-[var(--muted-foreground)]"
                >
                  Sign Out
                </button>
              ) : (
                <Link
                  href="/c/signin"
                  onClick={() => setMenuOpen(false)}
                  className="py-4 text-xs font-bold uppercase tracking-[0.15em] text-[var(--primary)]"
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
