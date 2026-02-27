import { logger } from "@/lib/logger";

/**
 * Extracts a human-readable error message from a failed fetch response.
 * Attempts to parse the JSON body for an `error` field, falling back to
 * a generic status-code message.
 */
export async function extractFetchErrorMessage(response: Response): Promise<string> {
  let message = `Request failed with status ${response.status}.`;
  try {
    const payload = await response.json();
    if (payload?.error) {
      message = payload.error as string;
    }
  } catch (jsonError) {
    logger.debug("Unable to parse error response", { error: jsonError });
  }
  return message;
}
