"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link2, Copy, Ban } from "lucide-react";
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

type ShareButtonBProps = {
  tripId: string;
};

export function ShareButtonB({ tripId }: ShareButtonBProps) {
  const [share, setShare] = useState<ShareRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const { user } = useAppState();
  const isAuthenticated = !!user.email;

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
        await navigator.clipboard.writeText(share.shareUrl);
        showToast("Link copied to clipboard", { variant: "success" });
        return;
      }

      const res = await fetch(`/api/trips/${tripId}/share`, { method: "POST" });
      if (!res.ok) throw new Error(`Failed to create share: ${res.status}`);

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
      if (!res.ok) throw new Error(`Failed to toggle share: ${res.status}`);

      const data = await res.json();
      setShare(data.share);
      setMenuOpen(false);
      showToast(data.share.isActive ? "Sharing enabled" : "Share link deactivated", {
        variant: data.share.isActive ? "success" : "info",
      });
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
        className="flex h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium shrink-0 transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
        style={{
          borderColor: share?.isActive
            ? "var(--success)"
            : "var(--border)",
          backgroundColor: share?.isActive
            ? "color-mix(in srgb, var(--success) 10%, transparent)"
            : "transparent",
          color: share?.isActive ? "var(--success)" : "var(--muted-foreground)",
          opacity: isLoading ? 0.5 : 1,
          cursor: isLoading ? "not-allowed" : "pointer",
        }}
        title={share?.isActive ? "Manage share link" : "Share itinerary"}
      >
        <Link2 className="h-4 w-4" />
        <span className="hidden sm:inline">
          {isLoading ? "Sharing..." : share?.isActive ? "Shared" : "Share"}
        </span>
      </button>

      {menuOpen && share?.isActive && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border p-3"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--card)",
            boxShadow: "var(--shadow-elevated)",
          }}
        >
          <p
            className="text-xs font-medium"
            style={{ color: "var(--muted-foreground)" }}
          >
            Share link active
          </p>

          {share.viewCount > 0 && (
            <p
              className="mt-1 text-[11px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              {share.viewCount} {share.viewCount === 1 ? "view" : "views"}
            </p>
          )}

          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex h-11 items-center gap-2 rounded-xl px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
              style={{
                backgroundColor: "color-mix(in srgb, var(--success) 10%, transparent)",
                color: "var(--success)",
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </button>

            <button
              type="button"
              onClick={handleToggleShare}
              disabled={isLoading}
              className="flex h-11 items-center gap-2 rounded-xl px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
              style={{ color: "var(--muted-foreground)" }}
            >
              <Ban className="h-3.5 w-3.5" />
              Disable sharing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
