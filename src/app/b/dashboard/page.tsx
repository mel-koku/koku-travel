import type { Metadata } from "next";

import { getAuthUser } from "@/lib/auth/middleware";
import { DashboardClientB } from "@b/features/dashboard/DashboardClientB";
import { getPagesContent } from "@/lib/sanity/contentService";

export const metadata: Metadata = {
  title: "Dashboard | Koku Travel",
  description:
    "Your Japan travel hub. Access your saved trips, favorite locations, and personalized recommendations.",
};

export const dynamic = "force-dynamic";

export default async function DashboardPageB() {
  const [authUser, content] = await Promise.all([
    getAuthUser(),
    getPagesContent(),
  ]);

  return (
    <DashboardClientB
      initialAuthUser={
        authUser ? { id: authUser.id, email: authUser.email } : null
      }
      content={content ?? undefined}
    />
  );
}
