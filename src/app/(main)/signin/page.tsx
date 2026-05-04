import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/middleware";
import { getPagesContent } from "@/lib/sanity/contentService";
import { SignInClient } from "./SignInClient";
import { DEFAULT_OG_IMAGES } from "@/lib/seo/defaults";

export const metadata: Metadata = {
  title: "Sign In | Yuku Japan",
  description: "Sign in to save trips, sync favorites across devices, and pick up where you left off.",
  alternates: { canonical: "/signin" },
  openGraph: {
    images: DEFAULT_OG_IMAGES,
    title: "Sign In | Yuku Japan",
    description: "Sign in to save trips, sync favorites across devices, and pick up where you left off.",
    url: "/signin",
    siteName: "Yuku Japan",
    type: "website",
  },
  robots: { index: false, follow: true },
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
