"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

import IdentityBadge, { useAuthState } from "@/components/ui/IdentityBadge";
import { Dropdown } from "@/components/ui/Dropdown";
import { useLenis } from "@/providers/LenisProvider";
import { createClient } from "@/lib/supabase/client";
import { useAppState } from "@/state/AppState";
import { cn } from "@/lib/cn";
import { springNavigation } from "@/lib/motion";
import { MenuTrigger } from "@/components/header/MenuTrigger";
import { MenuOverlay } from "@/components/header/MenuOverlay";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

const navItems = [
  { label: "Places", href: "/places" },
  { label: "Guides", href: "/guides" },
  { label: "Pricing", href: "/pricing" },
  { label: "Concierge", href: "/concierge" },
];

function UserMenu({
  isSignedIn,
  supabase,
  router,
  onDark = false,
}: {
  isSignedIn: boolean;
  supabase: SupabaseClient;
  router: AppRouterInstance;
  onDark?: boolean;
}) {
  const { clearAllLocalData, trips, saved } = useAppState();
  const hasLocalTrip = !isSignedIn && trips.length > 0;
  const hasLocalSaves = !isSignedIn && saved.length > 0;

  const handleClearData = () => {
    const body = isSignedIn
      ? "This removes all trips, saved places, and preferences from this device. Your account data stays safe in the cloud."
      : "This removes all trips, saved places, and preferences from this device. You haven\u2019t signed in, so there\u2019s no cloud backup.";

    const confirmed = window.confirm(`Start fresh?\n\n${body}`);

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
          id: "saved",
          label: "Saved Places",
          onSelect: () => router.push("/saved"),
        },
        {
          id: "account",
          label: "Account",
          onSelect: () => router.push("/account"),
        },
        {
          id: "signout",
          label: "Sign out",
          onSelect: async () => {
            await supabase.auth.signOut();
            clearAllLocalData();
            router.refresh();
          },
        },
      ]
    : [
        ...(hasLocalTrip
          ? [
              {
                id: "your-trip",
                label: "Your Trip",
                onSelect: () => router.push("/dashboard"),
              },
            ]
          : hasLocalSaves
          ? [
              {
                id: "dashboard",
                label: "Dashboard",
                onSelect: () => router.push("/dashboard"),
              },
            ]
          : []),
        {
          id: "saved",
          label: "Saved Places",
          onSelect: () => router.push("/saved"),
        },
        {
          id: "signin",
          label: (
            <span className="font-semibold text-brand-primary">Sign in</span>
          ),
          separated: true,
          onSelect: () => router.push("/signin"),
        },
        {
          id: "cleardata",
          label: (
            <span className="text-foreground-secondary">Start fresh</span>
          ),
          separated: true,
          onSelect: handleClearData,
        },
      ];

  return (
    <Dropdown
      label={<IdentityBadge compact onDark={onDark} />}
      align="end"
      hideChevron={true}
      ariaLabel="Account menu"
      triggerClassName="!border-0 !bg-transparent !shadow-none !p-0 hover:!bg-transparent !rounded-none gap-0"
      items={items}
    />
  );
}

/**
 * Native scroll fallback for routes where LenisProvider isn't mounted.
 * Mirrors the `scrollProgress` (0..1) and `direction` (1 down / -1 up)
 * shape that Lenis exposes so Header's hide/show logic works identically
 * on landing (Lenis-driven) and non-landing (native).
 */
function useNativeScrollSignals(enabled: boolean) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    let lastY = window.scrollY;

    const update = () => {
      const y = window.scrollY;
      const max = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      setScrollProgress(Math.min(1, Math.max(0, y / max)));
      const delta = y - lastY;
      if (delta > 0) setDirection(1);
      else if (delta < 0) setDirection(-1);
      lastY = y;
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [enabled]);

  return { scrollProgress, direction };
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { isSignedIn } = useAuthState();
  const lenisCtx = useLenis();
  const hasLenis = lenisCtx.lenis !== null;
  const fallback = useNativeScrollSignals(!hasLenis);
  const scrollProgress = hasLenis ? lenisCtx.scrollProgress : fallback.scrollProgress;
  const direction = hasLenis ? lenisCtx.direction : fallback.direction;
  const prefersReducedMotion = useReducedMotion();

  const isLandingPage = pathname === "/";
  const isOverHero = isLandingPage && scrollProgress < 0.08;

  // Track scroll progress and direction refs for stable access
  const scrollProgressRef = useRef(scrollProgress);
  const scrollAccumRef = useRef(0);
  const lastScrollYRef = useRef(0);
  useEffect(() => { scrollProgressRef.current = scrollProgress; }, [scrollProgress]);

  // Direction-based hide/show with scroll hysteresis
  // Require 50px of cumulative upward scroll to show, 20px downward to hide
  useEffect(() => {
    if (isMenuOpen) {
      setIsVisible(true);
      return;
    }

    // Pages with sticky sub-nav: always visible
    if (pathname === "/places" || pathname === "/guides" || pathname.startsWith("/itinerary")) {
      setIsVisible(true);
      return;
    }

    // Landing page hero zone: keep visible
    if (isLandingPage && scrollProgressRef.current < 0.08) {
      setIsVisible(true);
      return;
    }

    // Always visible at top (non-landing pages)
    if (!isLandingPage && scrollProgressRef.current < 0.01) {
      setIsVisible(true);
      return;
    }

    const currentY = typeof window !== "undefined" ? window.scrollY : 0;
    const delta = currentY - lastScrollYRef.current;
    lastScrollYRef.current = currentY;

    // Reset accumulator on direction change
    if ((delta > 0 && scrollAccumRef.current < 0) || (delta < 0 && scrollAccumRef.current > 0)) {
      scrollAccumRef.current = 0;
    }
    scrollAccumRef.current += delta;

    // Hysteresis thresholds
    if (scrollAccumRef.current > 20) {
      setIsVisible(false);
    } else if (scrollAccumRef.current < -50) {
      setIsVisible(true);
    }
  }, [direction, isMenuOpen, isLandingPage, pathname, scrollProgress]);

  const handleMenuToggle = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const headerSpring = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, ...springNavigation };

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[9998] focus:rounded-md focus:bg-brand-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-[var(--shadow-elevated)]"
      >
        Skip to main content
      </a>

      <motion.header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top)] transition-colors duration-300",
          isOverHero ? "bg-transparent" : "bg-background/95 backdrop-blur-xl"
        )}
        initial={{ y: 0, opacity: 1 }}
        animate={{
          y: isVisible || isMenuOpen ? 0 : -100,
          opacity: 1,
        }}
        transition={headerSpring}
      >
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2"
          >
            <span className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  "font-serif text-2xl tracking-[-0.03em] transition-colors duration-300 sm:text-3xl",
                  isOverHero ? "text-white" : "text-foreground"
                )}
              >
                Yuku
              </span>
              <span
                className={cn(
                  "text-sm font-light uppercase tracking-wide transition-colors duration-300",
                  isOverHero ? "text-white/70" : "text-foreground-secondary"
                )}
              >
                Japan
              </span>
            </span>
          </Link>

          {/* Desktop inline nav (lg+) */}
          <nav className="hidden items-center gap-8 text-sm font-medium uppercase tracking-wide lg:flex">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "group relative py-1 transition-colors duration-300",
                    isOverHero
                      ? isActive
                        ? "text-white"
                        : "text-white/80 hover:text-white"
                      : isActive
                        ? "text-brand-primary"
                        : "text-foreground-secondary hover:text-foreground"
                  )}
                >
                  {item.label}
                  <span
                    className={cn(
                      "absolute -bottom-0.5 left-0 h-[2px] w-full origin-left transition-transform duration-300 ease-out",
                      isOverHero ? "bg-white" : "bg-brand-primary",
                      isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    )}
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-1 sm:gap-3 lg:gap-6">
            {/* CTA button (lg+) */}
            <Link
              href="/trip-builder"

              className="hidden h-10 items-center rounded-lg bg-brand-primary px-5 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-brand-primary/90 active:scale-[0.98] lg:flex"
            >
              Build My Trip
            </Link>


            {/* Desktop user menu (lg+) */}
            <div className="hidden lg:block">
              <UserMenu
                isSignedIn={isSignedIn}
                supabase={supabase}
                router={router}
                onDark={isOverHero}
              />
            </div>

            {/* Menu trigger (mobile) */}
            <div className="flex items-center lg:hidden">
              <MenuTrigger
                isOpen={isMenuOpen}
                onToggle={handleMenuToggle}
                color={isOverHero ? "white" : "foreground"}
              />
            </div>
          </div>
        </div>
      </motion.header>

      {/* Full-screen menu overlay */}
      <MenuOverlay
        isOpen={isMenuOpen}
        onClose={handleMenuClose}
      />

      {/* Spacer for fixed header on non-landing pages */}
      {!isLandingPage && <div className="h-[var(--header-h)]" aria-hidden="true" />}
    </>
  );
}
