/**
 * Extracts a human-readable error message from an unknown error value.
 * Handles Error instances, plain objects with a `message` property, and strings.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return String(error);
}

/**
 * Returns true if the error is a Supabase "Auth session missing" error,
 * which is expected when the user is not logged in. Sync operations
 * should treat this as a no-op (return success with local data).
 */
export function isAuthSessionMissing(error: unknown): boolean {
  return getErrorMessage(error).includes("Auth session missing");
}
