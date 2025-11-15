"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAppState } from "@/state/AppState";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/cn";

function AvatarCircle({ initial }: { initial: string }) {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-sm font-semibold">
      {initial.toUpperCase()}
    </span>
  );
}

export default function UserMenu({ className = "" }: { className?: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { user } = useAppState();
  const [email, setEmail] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let alive = true;
    if (!supabase) {
      setIsAuthenticated(false);
      return;
    }

    // Initial check
    supabase
      .auth
      .getUser()
      .then(({ data: { user: authUser } }: { data: { user: User | null } }) => {
        if (alive) {
          setEmail(authUser?.email ?? null);
          setIsAuthenticated(Boolean(authUser));
        }
      })
      .catch((error: unknown) => {
        logger.warn("Failed to read Supabase user", { error });
        if (alive) {
          setIsAuthenticated(false);
        }
      });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (alive) {
          setEmail(session?.user?.email ?? null);
          setIsAuthenticated(Boolean(session?.user));
        }
      }
    );

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current?.contains(event.target as Node) ||
        triggerRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleSignOut = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      setOpen(false);
      router.refresh();
    } catch (error) {
      logger.error("Sign out failed", error instanceof Error ? error : new Error(String(error)));
    }
  };

  const label = user.displayName || email || "Guest";
  const initial = (label?.[0] ?? "G").toUpperCase();

  return (
    <div className={cn("relative inline-flex flex-col text-left", className)}>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex items-center gap-2 rounded-lg transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <AvatarCircle initial={initial} />
        <span className="hidden text-sm text-gray-800 md:inline">{label}</span>
      </button>

      {open ? (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right rounded-2xl border border-white/20 bg-white/80 backdrop-blur-xl p-2 shadow-2xl shadow-black/10 ring-1 ring-white/50 focus:outline-none dark:border-white/10 dark:bg-black/80 dark:ring-white/10"
        >
            <div className="py-1">
              {/* User info header */}
              <div className="px-3 py-2.5 border-b border-gray-200/50 dark:border-gray-700/50 mb-1">
                <div className="flex items-center gap-2">
                  <AvatarCircle initial={initial} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{label}</span>
                    {email && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{email}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Dashboard link */}
              <Link
                href="/dashboard"
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left text-sm text-gray-800 dark:text-gray-200 transition-all duration-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/40 hover:translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <span className="font-medium">Dashboard</span>
              </Link>

              {/* Account link */}
              <Link
                href="/account"
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left text-sm text-gray-800 dark:text-gray-200 transition-all duration-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/40 hover:translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <span className="font-medium">Account</span>
              </Link>

              {/* Sign In link (only if not authenticated) */}
              {!isAuthenticated && (
                <Link
                  href="/account"
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left text-sm text-indigo-600 dark:text-indigo-400 transition-all duration-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/40 hover:translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  <span className="font-medium">Sign In</span>
                </Link>
              )}

              {/* Sign out button (only if authenticated) */}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 transition-all hover:bg-red-50/80 dark:hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                  role="menuitem"
                >
                  <span className="font-medium">Sign Out</span>
                </button>
              )}
            </div>
          </div>
      ) : null}
    </div>
  );
}

