import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/middleware";
import { TripReviewC } from "@c/features/dashboard/TripReviewC";

export const metadata: Metadata = {
  title: "Trip Review | Koku Travel",
  description: "Look back on your Japan journey.",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ trip?: string }>;
};

export default async function TripReviewPageC({ searchParams }: PageProps) {
  const [authUser, params] = await Promise.all([getAuthUser(), searchParams]);

  if (!authUser || !params.trip) {
    redirect("/c/dashboard");
  }

  return <TripReviewC tripId={params.trip} />;
}
