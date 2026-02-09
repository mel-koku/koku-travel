"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

import IdentityBadge, { useAuthState } from "@/components/ui/IdentityBadge";
import { Dropdown } from "@/components/ui/Dropdown";
import { Magnetic } from "@/components/ui/Magnetic";
import { useCursor } from "@/providers/CursorProvider";
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
  { label: "Explore", href: "/explore" },
  { label: "Guides", href: "/guides" },
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
      "\u26a0\ufe0f WARNING: Clear All Local Data?\n\n" +
        "This action cannot be undone. You will permanently lose:\n" +
        "\u2022 All saved trips and itineraries\n" +
        "\u2022 All favorites/bookmarks\n" +
        "\u2022 Trip builder preferences\n" +
        "\u2022 Your display name and local profile\n\n" +
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
                className="h-[1em] w-[1em] flex-shrink-0 text-warning"
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { isSignedIn } = useAuthState();
  const { setCursorState } = useCursor();
  const { scrollProgress, direction } = useLenis();
  const prefersReducedMotion = useReducedMotion();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const isLandingPage = pathname === "/";

  // On landing page, header starts hidden and reveals after hero scroll
  const [heroRevealed, setHeroRevealed] = useState(!isLandingPage);

  // Scroll-aware visibility with debounce
  useEffect(() => {
    if (isMenuOpen) {
      setIsVisible(true);
      return;
    }

    // Explore/Guides/Itinerary: always keep header visible (sticky sub-nav/map panels depend on it)
    if (pathname === "/explore" || pathname === "/guides" || pathname.startsWith("/itinerary")) {
      setIsVisible(true);
      return;
    }

    // Landing page: stay hidden until user scrolls past hero title
    if (isLandingPage && scrollProgress < 0.025) {
      setHeroRevealed(false);
      setIsVisible(true);
      return;
    }

    // Landing page: just revealed — keep visible through the hero section
    // Don't let scroll-down-to-hide kick in while still in the hero zone
    if (isLandingPage && scrollProgress < 0.08) {
      if (!heroRevealed) setHeroRevealed(true);
      setIsVisible(true);
      return;
    }

    if (isLandingPage && !heroRevealed) {
      setHeroRevealed(true);
    }

    // Always visible at top (non-landing pages)
    if (!isLandingPage && scrollProgress < 0.01) {
      setIsVisible(true);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (direction === 1) {
        // Scrolling down → hide
        setIsVisible(false);
      } else if (direction === -1) {
        // Scrolling up → show
        setIsVisible(true);
      }
    }, 50);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [scrollProgress, direction, isMenuOpen, isLandingPage, pathname, heroRevealed]);

  const handleMenuToggle = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  // Header is always transparent with blur on dark site
  const isAtTop = scrollProgress < 0.02 && !isMenuOpen;

  const headerSpring = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, ...springNavigation };

  return (
    <>
      <motion.header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-colors duration-300",
          isAtTop
            ? "bg-transparent"
            : "bg-background/60 backdrop-blur-xl border-b border-border/30"
        )}
        animate={{
          y: isVisible || isMenuOpen ? 0 : -100,
          opacity: isLandingPage && !heroRevealed ? 0 : 1,
        }}
        transition={headerSpring}
      >
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 sm:px-6 md:px-8">
          {/* Logo */}
          <Magnetic strength={0.15}>
            <Link
              href="/"
              className="flex items-baseline gap-1.5"
              onMouseEnter={() => setCursorState("link")}
              onMouseLeave={() => setCursorState("default")}
            >
              <span className="font-serif text-2xl italic text-foreground sm:text-3xl">
                Koku
              </span>
              <span className="text-sm font-light uppercase tracking-wide text-foreground-secondary">
                Travel
              </span>
            </Link>
          </Magnetic>

          {/* Desktop inline nav (lg+) */}
          <nav className="hidden items-center gap-8 text-sm font-medium uppercase tracking-wide lg:flex">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Magnetic key={item.label} strength={0.15}>
                  <Link
                    href={item.href}
                    onMouseEnter={() => setCursorState("link")}
                    onMouseLeave={() => setCursorState("default")}
                    className={cn(
                      "group relative py-1 transition-colors",
                      isActive
                        ? "text-brand-primary"
                        : "text-foreground-secondary hover:text-foreground"
                    )}
                  >
                    {item.label}
                    {/* Animated underline */}
                    <span
                      className={cn(
                        "absolute -bottom-0.5 left-0 h-[2px] w-full origin-left transition-transform duration-300 ease-out",
                        "bg-brand-primary",
                        isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      )}
                      aria-hidden="true"
                    />
                  </Link>
                </Magnetic>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Desktop user menu (lg+) */}
            <div className="hidden lg:block">
              <UserMenu
                isSignedIn={isSignedIn}
                supabase={supabase}
                router={router}
              />
            </div>

            {/* Menu trigger (< lg) */}
            <div className="lg:hidden">
              <MenuTrigger
                isOpen={isMenuOpen}
                onToggle={handleMenuToggle}
                color="white"
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
      {!isLandingPage && <div className="h-20" aria-hidden="true" />}
    </>
  );
}
