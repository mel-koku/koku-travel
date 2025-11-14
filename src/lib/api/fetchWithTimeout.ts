/**
 * Fetches a resource with a timeout.
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options (same as standard fetch)
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns Promise that resolves to the Response or rejects with a timeout error
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  }
}

