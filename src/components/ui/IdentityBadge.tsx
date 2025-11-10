"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppState } from "@/state/AppState";

function circle(initial: string) {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-sm font-semibold">
      {initial.toUpperCase()}
    </span>
  );
}

export default function IdentityBadge({ className = "" }: { className?: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAppState();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (alive) setEmail(user?.email ?? null);
    });
    return () => {
      alive = false;
    };
  }, [supabase]);

  const label = user.displayName || email || "Guest";
  const initial = (label?.[0] ?? "G").toUpperCase();

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {circle(initial)}
      <span className="text-sm text-gray-800">{label}</span>
    </span>
  );
}