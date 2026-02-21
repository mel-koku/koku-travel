import type { Metadata } from "next";

import { AccountClient } from "./AccountClient";
import { getPagesContent } from "@/lib/sanity/contentService";

export const metadata: Metadata = {
  title: "Account | Koku Travel",
  description: "Manage your Koku Travel account settings and preferences.",
  openGraph: {
    title: "Account | Koku Travel",
    description: "Manage your Koku Travel account settings and preferences.",
    siteName: "Koku Travel",
  },
};

// Force dynamic rendering — page shows user-specific content
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const content = await getPagesContent();

  return <AccountClient content={content ?? undefined} />;
}
