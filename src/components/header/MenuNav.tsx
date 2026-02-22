"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Magnetic } from "@/components/ui/Magnetic";
import { easeRevealMut, staggerItem, durationMicro } from "@/lib/motion";
import { useCursor } from "@/providers/CursorProvider";
import { useAuthState } from "@/components/ui/IdentityBadge";
import { createClient } from "@/lib/supabase/client";
import { useAppState } from "@/state/AppState";

const navItems = [
  { number: "01", label: "Places", href: "/places" },
  { number: "02", label: "Guides", href: "/guides" },
  { number: "03", label: "Experiences", href: "/experiences" },
  { number: "04", label: "Plan a Trip", href: "/trip-builder" },
];

type MenuNavProps = {
  onClose: () => void;
};

export function MenuNav({ onClose }: MenuNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setCursorState } = useCursor();
  const { isSignedIn } = useAuthState();
  const { clearAllLocalData } = useAppState();
  const supabase = createClient();
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = prefersReducedMotion
    ? undefined
    : {
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerItem,
            delayChildren: 0.15,
          },
        },
        exit: {
          transition: {
            staggerChildren: 0.03,
            staggerDirection: -1,
          },
        },
      };

  const itemVariants = prefersReducedMotion
    ? undefined
    : {
        hidden: { opacity: 0, y: 40 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.6,
            ease: easeRevealMut,
          },
        },
        exit: {
          opacity: 0,
          y: 20,
          transition: { duration: durationMicro, ease: easeRevealMut },
        },
      };

  const bottomVariants = prefersReducedMotion
    ? undefined
    : {
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.5,
            delay: 0.4,
            ease: easeRevealMut,
          },
        },
        exit: {
          opacity: 0,
          transition: { duration: durationMicro, ease: easeRevealMut },
        },
      };

  const handleClearData = () => {
    const confirmed = window.confirm(
      "Start fresh?\n\n" +
        "This removes all trips, saved places, and preferences from this device.\n\n" +
        "Your account data stays safe in the cloud."
    );
    if (confirmed) {
      clearAllLocalData();
      router.refresh();
      onClose();
    }
  };

  return (
    <motion.nav
      className="flex h-full flex-col px-6 py-12 sm:px-8 lg:px-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Logo */}
      <motion.div className="mb-8" variants={itemVariants}>
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-2"
        >
          <span className="flex items-baseline gap-1.5">
            <span className="font-serif text-2xl italic text-foreground sm:text-3xl">
              Koku
            </span>
            <span className="text-sm font-light uppercase tracking-wide text-foreground-secondary">
              Travel
            </span>
          </span>
        </Link>
      </motion.div>

      <div className="flex flex-col gap-2 sm:gap-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <motion.div key={item.href} variants={itemVariants}>
              <Magnetic strength={0.15}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  onMouseEnter={() => setCursorState("link")}
                  onMouseLeave={() => setCursorState("default")}
                  className="group flex items-baseline gap-4 py-2"
                >
                  <span className="font-mono text-sm text-stone transition-colors group-hover:text-brand-primary">
                    {item.number}
                  </span>
                  <span className="relative">
                    <span
                      className={`font-serif italic text-3xl sm:text-5xl tracking-tight transition-colors md:text-6xl lg:text-7xl ${
                        isActive ? "text-brand-primary" : "text-foreground group-hover:text-foreground/80"
                      }`}
                    >
                      {item.label}
                    </span>
                    {/* Animated underline */}
                    <span
                      className="absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 bg-brand-primary transition-transform duration-300 ease-out group-hover:scale-x-100"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </Magnetic>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom section: secondary links */}
      <motion.div
        className="mt-auto flex flex-col gap-3 border-t border-border pt-6"
        variants={bottomVariants}
      >
        <Link
          href="/dashboard"
          onClick={onClose}
          onMouseEnter={() => setCursorState("link")}
          onMouseLeave={() => setCursorState("default")}
          className="py-2.5 text-base font-medium text-foreground-secondary transition-colors hover:text-foreground"
        >
          Dashboard
        </Link>
        {isSignedIn ? (
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              router.refresh();
              onClose();
            }}
            onMouseEnter={() => setCursorState("link")}
            onMouseLeave={() => setCursorState("default")}
            className="py-2.5 text-left text-base font-medium text-foreground-secondary transition-colors hover:text-foreground"
          >
            Sign out
          </button>
        ) : (
          <Link
            href="/account"
            onClick={onClose}
            onMouseEnter={() => setCursorState("link")}
            onMouseLeave={() => setCursorState("default")}
            className="py-2.5 text-base font-medium text-foreground-secondary transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        )}
        <button
          type="button"
          onClick={handleClearData}
          onMouseEnter={() => setCursorState("link")}
          onMouseLeave={() => setCursorState("default")}
          className="flex items-center gap-2 py-2.5 text-left text-sm text-stone transition-colors hover:text-warning"
        >
          <span>Clear local data</span>
          <svg
            className="h-[1em] w-[1em] flex-shrink-0"
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
        </button>
      </motion.div>
    </motion.nav>
  );
}
