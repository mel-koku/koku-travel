import { getAuthUser } from "@/lib/auth/middleware";
import { DashboardClient } from "./DashboardClient";
import { getPagesContent } from "@/lib/sanity/contentService";

// Force dynamic rendering because we use server-side authentication
export const dynamic = "force-dynamic";

/**
 * Dashboard page - Unified dashboard that works for both authenticated and guest users.
 * Shows appropriate content based on authentication state without redirecting.
 */
export default async function DashboardPage() {
  const [authUser, content] = await Promise.all([
    getAuthUser(),
    getPagesContent(),
  ]);

  return (
    <DashboardClient
      initialAuthUser={authUser ? { id: authUser.id, email: authUser.email } : null}
      content={content ?? undefined}
    />
  );
}


