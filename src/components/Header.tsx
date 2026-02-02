"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import IdentityBadge, { useAuthState } from "@/components/ui/IdentityBadge";
import { Dropdown } from "@/components/ui/Dropdown";
import { createClient } from "@/lib/supabase/client";
import { useAppState } from "@/state/AppState";
import { cn } from "@/lib/cn";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

const navItems = [
  { label: "Explore", href: "/explore" },
  { label: "Guides", href: "/guides" },
  // { label: "Community", href: "/community" }, // Hidden for future development
  { label: "Trip Builder", href: "/trip-builder" },
];

function UserMenu({
  isSignedIn,
  supabase,
  router,
}: {
  isSignedIn: boolean;
  supabase: SupabaseClient;
  router: AppRouterInstance;
}) {
  const { clearAllLocalData } = useAppState();

  const handleClearData = () => {
    const confirmed = window.confirm(
      "⚠️ WARNING: Clear All Local Data?\n\n" +
      "This action cannot be undone. You will permanently lose:\n" +
      "• All saved trips and itineraries\n" +
      "• All favorites/bookmarks\n" +
      "• Trip builder preferences\n" +
      "• Your display name and local profile\n\n" +
      "If you're signed in, your cloud data will remain safe.\n\n" +
      "Are you sure you want to continue?"
    );
    
    if (confirmed) {
      clearAllLocalData();
      router.refresh();
    }
  };

  const items = isSignedIn
    ? [
        {
          id: "dashboard",
          label: "Dashboard",
          onSelect: () => router.push("/dashboard"),
        },
        {
          id: "signout",
          label: "Sign out",
          onSelect: async () => {
            await supabase.auth.signOut();
            router.refresh();
          },
        },
      ]
    : [
        {
          id: "dashboard",
          label: "Dashboard",
          onSelect: () => router.push("/dashboard"),
        },
        {
          id: "signin",
          label: "Sign in",
          onSelect: () => router.push("/account"),
        },
        {
          id: "cleardata",
          label: (
            <span className="flex items-center justify-between gap-2">
              <span>Clear local data</span>
              <svg
                className="h-[1em] w-[1em] text-semantic-warning flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </span>
          ),
          onSelect: handleClearData,
        },
      ];

  return (
    <Dropdown
      label={<IdentityBadge showChevron={true} />}
      align="end"
      hideChevron={true}
      triggerClassName="!border-0 !bg-transparent !shadow-none !p-0 hover:!bg-transparent !rounded-none gap-0"
      items={items}
    />
  );
}

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const prevPathnameRef = useRef(pathname);
  const supabase = useMemo(() => createClient(), []);
  const { isSignedIn } = useAuthState();

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

  const isLandingPage = pathname === "/";

  return (
    <header className={cn(
      "top-0 z-50",
      isLandingPage
        ? "absolute w-full bg-transparent"
        : "sticky border-b border-border bg-background/90 backdrop-blur"
    )}>
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 sm:px-6 md:px-8">
        <Link href="/" className="flex flex-col">
          <span className={cn(
            "text-xl sm:text-2xl font-semibold",
            isLandingPage ? "text-white" : "text-charcoal"
          )}>Koku Travel</span>
          <span className={cn(
            "text-[10px] sm:text-xs uppercase tracking-[0.2em]",
            isLandingPage ? "text-white/70" : "text-stone"
          )}>
            Japan Planner
          </span>
        </Link>

        <nav className={cn(
          "hidden items-center gap-8 text-sm font-medium uppercase tracking-wide md:flex",
          isLandingPage && "text-white"
        )}>
          {navItems.map((item) => (
            <Link
              key={item.label}
              className={cn(
                "transition-colors",
                isLandingPage ? "hover:text-white/70" : "hover:text-brand-primary"
              )}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="hidden md:block">
            <UserMenu isSignedIn={isSignedIn} supabase={supabase} router={router} />
          </div>
          <Link href="/account" className="inline-flex md:hidden">
              <span className={cn(
                "rounded-full border px-5 py-2.5 text-sm font-medium",
                isLandingPage ? "border-white text-white hover:bg-white/10" : "border-border text-warm-gray hover:bg-sand"
              )}>
              {isSignedIn ? "Account" : "Sign in"}
            </span>
          </Link>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary md:hidden",
              isLandingPage ? "text-white hover:bg-white/10" : "text-warm-gray hover:bg-sand"
            )}
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
            "fixed inset-0 z-60 bg-black/50 transition-opacity duration-300 ease-out md:hidden",
            isMobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
        <nav
          className={cn(
            "fixed inset-y-0 right-0 z-70 w-full max-w-xs sm:max-w-sm bg-background shadow-xl transition-transform duration-300 ease-out md:hidden overflow-y-auto scroll-smooth",
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
          )}
          aria-label="Mobile navigation"
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border p-5 sm:p-6">
              <Link href="/" className="flex flex-col" onClick={() => setIsMobileMenuOpen(false)}>
                <span className="text-lg font-semibold text-charcoal">Koku Travel</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-stone">Japan Planner</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-warm-gray transition-colors hover:bg-sand"
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
                      "rounded-lg px-4 py-4 text-base font-medium text-charcoal transition-colors hover:bg-sand",
                      pathname === item.href && "bg-surface text-brand-primary"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

                <div className="mt-6 border-t border-border pt-6">
                  <Link
                    href="/dashboard"
                    className="block rounded-lg px-4 py-3 text-base font-medium text-charcoal transition-colors hover:bg-sand"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  {!isSignedIn && (
                    <Link
                      href="/account"
                      className="mt-2 block rounded-lg px-4 py-3 text-base font-medium text-charcoal transition-colors hover:bg-sand"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign in
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </nav>
        </>
    </header>
  );
}
