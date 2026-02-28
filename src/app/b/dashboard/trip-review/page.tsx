import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/middleware";
import { TripReviewB } from "@b/features/dashboard/TripReviewB";

export const metadata: Metadata = {
  title: "Trip Review | Koku Travel",
  description: "Look back on your Japan journey — stats, highlights, and memories.",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ trip?: string }>;
};

export default async function TripReviewPageB({ searchParams }: PageProps) {
  const [authUser, params] = await Promise.all([getAuthUser(), searchParams]);

  if (!authUser || !params.trip) {
    redirect("/b/dashboard");
  }

  return <TripReviewB tripId={params.trip} />;
}
