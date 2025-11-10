"use client";

export const WISHLIST_KEY = "koku_wishlist";

export function loadWishlist(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(WISHLIST_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveWishlist(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  } catch {
    // Swallow to prevent crashes in environments where storage is unavailable.
  }
}

