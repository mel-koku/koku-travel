/**
 * fetch() wrapper with a client-side timeout.
 *
 * Why: React Query's `queryFn` is perfectly happy to hang forever if the
 * server never responds. Without a timeout, pages stay on their loading
 * skeleton indefinitely — users see no error, no retry button, nothing.
 *
 * This helper composes:
 *   1. An internal AbortController that fires at `timeoutMs` (default 30s),
 *      throwing a user-facing "took too long" error that React Query
 *      surfaces via its normal error state.
 *   2. The caller's optional `signal` (typically React Query's signal), so
 *      the fetch is also cancelled when the query is retried/unmounted.
 *
 * Usage inside a useQuery queryFn:
 *
 *   useQuery({
 *     queryFn: ({ signal }) =>
 *       fetchWithTimeout("/api/things", { signal }).then(r => r.json()),
 *   });
 *
 * @param input Standard fetch input (URL or Request)
 * @param init  Standard fetch init, with optional `signal`
 * @param timeoutMs Milliseconds before the internal timeout fires (default 30_000)
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { signal?: AbortSignal | null } = {},
  timeoutMs = 30_000,
): Promise<Response> {
  const internalController = new AbortController();
  const timer = setTimeout(() => internalController.abort(), timeoutMs);

  // If the caller's signal aborts (e.g. React Query retry), cancel our timeout
  // so the internal controller aborts too and clears the timer.
  const callerSignal = init.signal ?? undefined;
  if (callerSignal) {
    if (callerSignal.aborted) {
      clearTimeout(timer);
      internalController.abort();
    } else {
      callerSignal.addEventListener("abort", () => internalController.abort(), {
        once: true,
      });
    }
  }

  try {
    return await fetch(input, { ...init, signal: internalController.signal });
  } catch (err) {
    // Distinguish "our timeout" from "caller aborted" when re-throwing.
    if (internalController.signal.aborted && !callerSignal?.aborted) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      throw new Error(`Request to ${url} took longer than ${timeoutMs / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
