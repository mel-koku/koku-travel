import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/middleware";
import { getPagesContent } from "@/lib/sanity/contentService";
import { SignInClient } from "./SignInClient";

export const metadata: Metadata = {
  title: "Sign In | Yuku Japan",
  description: "Sign in to Yuku Japan to save your trips, favorite locations, and get personalized Japan travel recommendations.",
  openGraph: {
    title: "Sign In | Yuku Japan",
    description: "Sign in to Yuku Japan to save your trips, favorite locations, and get personalized Japan travel recommendations.",
    siteName: "Yuku Japan",
  },
};

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const [authUser, content] = await Promise.all([
    getAuthUser(),
    getPagesContent(),
  ]);

  if (authUser) {
    redirect("/dashboard");
  }

  return <SignInClient content={content ?? undefined} />;
}
