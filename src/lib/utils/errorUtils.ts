/**
 * Extracts a human-readable error message from an unknown error value.
 * Replaces the common `error instanceof Error ? error.message : String(error)` pattern.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error);
}
