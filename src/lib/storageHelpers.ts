import { logger } from "./logger";

/**
 * Error types for localStorage operations
 */
export type StorageErrorType = "quota_exceeded" | "parse_error" | "security_error" | "unknown";

/**
 * Storage error details
 */
export type StorageError = {
  type: StorageErrorType;
  key: string;
  message: string;
  originalError?: unknown;
};

/**
 * Optional error callback for surfacing storage errors to the UI
 */
let storageErrorCallback: ((error: StorageError) => void) | null = null;

/**
 * Sets a global callback for storage errors.
 * UI can use this to show user-facing messages.
 */
export function setStorageErrorCallback(callback: ((error: StorageError) => void) | null): void {
  storageErrorCallback = callback;
}

/**
 * Notifies the error callback if set
 */
function notifyStorageError(error: StorageError): void {
  if (storageErrorCallback) {
    try {
      storageErrorCallback(error);
    } catch (e) {
      logger.warn("Storage error callback threw an error", { error: e });
    }
  }
}

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
    notifyStorageError({
      type: "parse_error",
      key,
      message: `Failed to parse stored data for "${key}"`,
      originalError: error,
    });
    return fallback;
  }
}

/**
 * Serializes and persists a value to localStorage.
 * Returns true on success, false on failure.
 */
export function setLocal<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    // Determine error type
    let errorType: StorageErrorType = "unknown";
    let message = `Failed to save data for "${key}"`;

    if (error instanceof Error) {
      // QuotaExceededError - storage is full
      if (error.name === "QuotaExceededError" || error.message.includes("quota")) {
        errorType = "quota_exceeded";
        message = "Storage is full. Please clear some data to continue saving.";
      }
      // SecurityError - private browsing mode or cross-origin
      else if (error.name === "SecurityError") {
        errorType = "security_error";
        message = "Unable to save data due to browser security settings.";
      }
    }

    logger.warn(`Failed to set localStorage key "${key}"`, { key, error, errorType });
    notifyStorageError({
      type: errorType,
      key,
      message,
      originalError: error,
    });
    return false;
  }
}


