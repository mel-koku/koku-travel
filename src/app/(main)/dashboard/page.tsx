import type { Metadata } from "next";

import { getAuthUser } from "@/lib/auth/middleware";
import { DashboardClient } from "./DashboardClient";
import { getPagesContent } from "@/lib/sanity/contentService";

export const metadata: Metadata = {
  title: "Dashboard | Yuku Japan",
  description: "Your Japan travel hub. Access your saved trips, favorite locations, and personalized recommendations.",
  alternates: { canonical: "/dashboard" },
  openGraph: {
    title: "Dashboard | Yuku Japan",
    description: "Your Japan travel hub. Access your saved trips, favorite locations, and personalized recommendations.",
    url: "/dashboard",
    siteName: "Yuku Japan",
    type: "website",
  },
  robots: { index: false, follow: true },
};

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


