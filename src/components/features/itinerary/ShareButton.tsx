"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { useAppState } from "@/state/AppState";
import { logger } from "@/lib/logger";

type ShareRecord = {
  id: string;
  shareToken: string;
  shareUrl: string;
  isActive: boolean;
  viewCount: number;
  createdAt: string;
};

type ShareButtonProps = {
  tripId: string;
};

export function ShareButton({ tripId }: ShareButtonProps) {
  const [share, setShare] = useState<ShareRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const { user } = useAppState();
  const isAuthenticated = !!user.email;

  // Fetch existing share status on mount (only if authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    fetch(`/api/trips/${tripId}/share`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data?.share) {
          setShare(data.share);
        }
      })
      .catch((error) => {
        logger.warn("Failed to check share status", {
          tripId,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [tripId, isAuthenticated]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleShare = useCallback(async () => {
    if (!isAuthenticated) {
      showToast("Sign in to share your itinerary", { variant: "error" });
      return;
    }

    setIsLoading(true);
    try {
      if (share?.isActive) {
        // Already shared — just copy URL
        await navigator.clipboard.writeText(share.shareUrl);
        showToast("Link copied to clipboard", { variant: "success" });
        return;
      }

      // Create new share
      const res = await fetch(`/api/trips/${tripId}/share`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error(`Failed to create share: ${res.status}`);
      }

      const data = await res.json();
      setShare(data.share);

      await navigator.clipboard.writeText(data.share.shareUrl);
      showToast("Link copied to clipboard", { variant: "success" });
    } catch (error) {
      logger.error("Failed to share trip", error instanceof Error ? error : new Error(String(error)));
      showToast("Failed to create share link. Try again.", { variant: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [tripId, share, showToast, isAuthenticated]);

  const handleToggleShare = useCallback(async () => {
    if (!share) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/share`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !share.isActive }),
      });

      if (!res.ok) {
        throw new Error(`Failed to toggle share: ${res.status}`);
      }

      const data = await res.json();
      setShare(data.share);
      setMenuOpen(false);

      if (data.share.isActive) {
        showToast("Sharing enabled", { variant: "success" });
      } else {
        showToast("Share link deactivated");
      }
    } catch (error) {
      logger.error("Failed to toggle share", error instanceof Error ? error : new Error(String(error)));
      showToast("Failed to update share. Try again.", { variant: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [tripId, share, showToast]);

  const handleCopyLink = useCallback(async () => {
    if (!share?.shareUrl) return;
    await navigator.clipboard.writeText(share.shareUrl);
    showToast("Link copied to clipboard", { variant: "success" });
    setMenuOpen(false);
  }, [share, showToast]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={share?.isActive ? () => setMenuOpen((prev) => !prev) : handleShare}
        disabled={isLoading}
        className={`flex h-[42px] items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition shrink-0 ${
          share?.isActive
            ? "border-sage bg-sage/10 text-sage"
            : "border-border text-stone hover:border-sage hover:text-foreground"
        } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        title={share?.isActive ? "Manage share link" : "Share itinerary"}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <span className="hidden sm:inline">
          {isLoading ? "Sharing..." : share?.isActive ? "Shared" : "Share"}
        </span>
      </button>

      {/* Share menu popover */}
      {menuOpen && share?.isActive && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-background p-3 shadow-lg">
          <p className="text-xs font-medium text-foreground-secondary">Share link active</p>

          {share.viewCount > 0 && (
            <p className="mt-1 font-mono text-[11px] text-stone">
              {share.viewCount} {share.viewCount === 1 ? "view" : "views"}
            </p>
          )}

          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-2 rounded-lg bg-sage/10 px-3 py-2 text-xs font-medium text-sage transition hover:bg-sage/20"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy link
            </button>

            <button
              type="button"
              onClick={handleToggleShare}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-stone transition hover:bg-error/10 hover:text-error"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Disable sharing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
