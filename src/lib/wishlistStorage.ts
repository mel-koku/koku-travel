"use client";

import { getLocal, setLocal } from "./storageHelpers";

export const WISHLIST_KEY = "koku_wishlist";

/**
 * Loads wishlist from localStorage.
 * Uses unified storage helper for consistency.
 */
export function loadWishlist(): string[] {
  return getLocal<string[]>(WISHLIST_KEY, []) ?? [];
}

/**
 * Saves wishlist to localStorage.
 * Uses unified storage helper for consistency.
 */
export function saveWishlist(ids: string[]): void {
  setLocal(WISHLIST_KEY, ids);
}

