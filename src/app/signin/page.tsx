import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/middleware";
import { getPagesContent } from "@/lib/sanity/contentService";
import { SignInClient } from "./SignInClient";

export const metadata: Metadata = {
  title: "Sign In | Koku Travel",
  description: "Sign in to Koku Travel to save your trips, favorite locations, and get personalized Japan travel recommendations.",
  openGraph: {
    title: "Sign In | Koku Travel",
    description: "Sign in to Koku Travel to save your trips, favorite locations, and get personalized Japan travel recommendations.",
    siteName: "Koku Travel",
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
