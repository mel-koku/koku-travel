"use client";
import { useEffect, useState } from "react";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAppState } from "@/state/AppState";
import { logger } from "@/lib/logger";

function circle(initial: string) {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sage/10 text-sage text-sm font-semibold">
      {initial.toUpperCase()}
    </span>
  );
}

export default function IdentityBadge({
  className = "",
  showChevron = false,
  isOpen = false,
  compact = false,
}: {
  className?: string;
  showChevron?: boolean;
  isOpen?: boolean;
  compact?: boolean;
}) {
  const supabase = createClient();
  const { user } = useAppState();
  const [email, setEmail] = useState<string | null>(null);
  const [_isSignedIn, setIsSignedIn] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;
    supabase
      .auth
      .getUser()
      .then(({ data: { user } }: { data: { user: User | null } }) => {
        if (alive) {
          setEmail(user?.email ?? null);
          setIsSignedIn(Boolean(user));
        }
      })
      .catch((error: unknown) => {
        logger.warn("Failed to read Supabase user", { error });
        if (alive) {
          setIsSignedIn(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [supabase]);

  const label = user.displayName || email || "Guest";
  const initial = (label?.[0] ?? "G").toUpperCase();

  if (compact) {
    return <span className={className}>{circle(initial)}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 ${className}`}>
      {circle(initial)}
      <span className="text-sm font-medium text-foreground">{label}</span>
      {showChevron && (
        <svg
          className={`h-4 w-4 text-foreground-secondary transform transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 20 20"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 8 4 4 4-4" />
        </svg>
      )}
    </span>
  );
}

// Export a hook to check authentication state
export function useAuthState() {
  const supabase = createClient();
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;
    setIsLoading(true);
    supabase
      .auth
      .getUser()
      .then(({ data: { user } }: { data: { user: User | null } }) => {
        if (alive) {
          setIsSignedIn(Boolean(user));
          setIsLoading(false);
        }
      })
      .catch((error: unknown) => {
        logger.warn("Failed to read Supabase user", { error });
        if (alive) {
          setIsSignedIn(false);
          setIsLoading(false);
        }
      });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (alive) {
        setIsSignedIn(Boolean(session?.user));
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return { isSignedIn, isLoading };
}