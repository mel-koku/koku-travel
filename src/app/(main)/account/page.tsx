import type { Metadata } from "next";

import { AccountClient } from "./AccountClient";
import { getPagesContent } from "@/lib/sanity/contentService";
import { DEFAULT_OG_IMAGES } from "@/lib/seo/defaults";

export const metadata: Metadata = {
  title: "Account | Yuku Japan",
  description: "Manage your Yuku Japan account settings and preferences.",
  alternates: { canonical: "/account" },
  openGraph: {
    images: DEFAULT_OG_IMAGES,
    title: "Account | Yuku Japan",
    description: "Manage your Yuku Japan account settings and preferences.",
    url: "/account",
    siteName: "Yuku Japan",
    type: "website",
  },
  robots: { index: false, follow: true },
};

// Force dynamic rendering — page shows user-specific content
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const content = await getPagesContent();

  return <AccountClient content={content ?? undefined} />;
}
