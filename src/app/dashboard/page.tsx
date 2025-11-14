import { getAuthUser } from "@/lib/auth/middleware";
import { DashboardClient } from "./DashboardClient";

// Force dynamic rendering because we use server-side authentication
export const dynamic = "force-dynamic";

/**
 * Dashboard page - Unified dashboard that works for both authenticated and guest users.
 * Shows appropriate content based on authentication state without redirecting.
 */
export default async function DashboardPage() {
  // Check auth state without redirecting - allows guests to view dashboard
  const authUser = await getAuthUser();

  return (
    <DashboardClient
      initialAuthUser={authUser ? { id: authUser.id, email: authUser.email } : null}
    />
  );
}


