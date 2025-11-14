import { requireAuth } from "@/lib/auth/middleware";
import { DashboardClient } from "./DashboardClient";

/**
 * Dashboard page - Server component wrapper that ensures authentication
 * before rendering the client component. This prevents the auth race condition
 * where protected content could briefly render before auth check completes.
 */
export default async function DashboardPage() {
  // This will redirect to /account if not authenticated
  const user = await requireAuth();

  return <DashboardClient initialUser={{ id: user.id, email: user.email }} />;
}


