"use client";

import { getLocal, setLocal } from "./storageHelpers";
import { WISHLIST_STORAGE_KEY } from "./constants/storage";

// Export for backward compatibility
export const WISHLIST_KEY = WISHLIST_STORAGE_KEY;

/**
 * Loads wishlist from localStorage.
 * Uses unified storage helper for consistency.
 */
export function loadWishlist(): string[] {
  return getLocal<string[]>(WISHLIST_STORAGE_KEY, []) ?? [];
}

/**
 * Saves wishlist to localStorage.
 * Uses unified storage helper for consistency.
 */
export function saveWishlist(ids: string[]): void {
  setLocal(WISHLIST_STORAGE_KEY, ids);
}

