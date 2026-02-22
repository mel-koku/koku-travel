"use client";

import { getLocal, setLocal } from "./storageHelpers";
import { SAVED_STORAGE_KEY } from "./constants/storage";

// Export for backward compatibility
export const SAVED_KEY = SAVED_STORAGE_KEY;

/**
 * Loads saved places from localStorage.
 * Uses unified storage helper for consistency.
 */
export function loadSaved(): string[] {
  return getLocal<string[]>(SAVED_STORAGE_KEY, []) ?? [];
}

/**
 * Saves saved places to localStorage.
 * Uses unified storage helper for consistency.
 */
export function saveSaved(ids: string[]): void {
  setLocal(SAVED_STORAGE_KEY, ids);
}
