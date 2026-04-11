/**
 * Pulls diagnostic fields off Vercel AI SDK's APICallError without importing
 * the class (duck-typed to avoid a hard dep). Use at every LLM call site so
 * Vertex regressions surface in structured logs instead of the opaque
 * `getErrorMessage(error)` one-liner.
 *
 * Captures:
 * - errorName (e.g., "AI_APICallError", "AI_NoObjectGeneratedError", "AbortError")
 * - statusCode (HTTP status from Vertex)
 * - url (path only — query string stripped so we don't log auth params)
 * - responseBody (500-char slice of the raw Vertex response body)
 * - apiErrorCode / apiErrorStatus / apiErrorMessage (structured Vertex error)
 */
export function extractApiErrorDetails(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== "object") return {};
  const e = error as Record<string, unknown>;
  const details: Record<string, unknown> = {};

  if (typeof e.name === "string") details.errorName = e.name;
  if (typeof e.statusCode === "number") details.statusCode = e.statusCode;
  if (typeof e.url === "string") {
    details.url = e.url.split("?")[0];
  }
  if (typeof e.responseBody === "string") {
    details.responseBody = e.responseBody.slice(0, 500);
  }

  // AI SDK wraps the provider's structured error under `.data.error`
  if (e.data && typeof e.data === "object") {
    const data = e.data as {
      error?: { code?: unknown; status?: unknown; message?: unknown };
    };
    if (data.error) {
      if (data.error.code !== undefined) details.apiErrorCode = data.error.code;
      if (data.error.status !== undefined) details.apiErrorStatus = data.error.status;
      if (data.error.message !== undefined) details.apiErrorMessage = data.error.message;
    }
  }

  // AbortError from AbortSignal.timeout() or a manual controller.abort()
  // shows up as `error.name === "AbortError"`. Flag it explicitly so the
  // log consumer can distinguish a client-side timeout from a Vertex reject.
  if (e.name === "AbortError" || e.name === "TimeoutError") {
    details.aborted = true;
  }

  return details;
}
