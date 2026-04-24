import "server-only";

/**
 * Server-only access check. Must not be imported from client components.
 * For client-side access checks, use isDayAccessible() from ./access.ts
 * with a pre-computed fullAccessEnabled boolean passed from the server.
 */
export async function isFullAccessEnabled(userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  if (process.env.FREE_FULL_ACCESS === "true") return true;

  try {
    const { getTripBuilderConfig } = await import("@/lib/sanity/contentService");
    const config = await getTripBuilderConfig();
    const window = config?.freeAccessWindow;
    if (window?.startDate && window?.endDate) {
      const now = new Date();
      const start = new Date(window.startDate);
      const end = new Date(window.endDate);
      end.setHours(23, 59, 59, 999);
      return now >= start && now <= end;
    }
  } catch {
    // Sanity unavailable -- default to paywall active
  }

  return false;
}
