import { logger } from "./logger";

/**
 * Safely reads JSON data from localStorage and returns the parsed value.
 */
export function getLocal<T>(key: string, fallback?: T): T | undefined {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const item = window.localStorage.getItem(key);
    if (!item) {
      return fallback;
    }

    return JSON.parse(item) as T;
  } catch (error) {
    logger.warn(`Failed to parse localStorage key "${key}"`, { key, error });
    return fallback;
  }
}

/**
 * Serializes and persists a value to localStorage.
 */
export function setLocal<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
  } catch (error) {
    logger.warn(`Failed to set localStorage key "${key}"`, { key, error });
  }
}


