"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function WizardChrome() {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <div className="fixed inset-x-0 top-0 z-50 border-b border-border/10 bg-background pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        <span className="flex items-baseline gap-1.5">
          <span className="font-serif text-2xl tracking-[-0.03em] text-foreground sm:text-3xl">
            Yuku
          </span>
          <span className="text-sm font-light uppercase tracking-wide text-foreground-secondary">
            Japan
          </span>
        </span>
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Close trip builder"
          className="eyebrow-editorial py-2 transition-colors hover:text-foreground"
        >
          Close
        </button>
      </div>
    </div>
  );
}
