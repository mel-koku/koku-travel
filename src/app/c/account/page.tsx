import type { Metadata } from "next";
import { AccountClientC } from "@c/features/account/AccountClientC";
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

export const dynamic = "force-dynamic";

export default async function AccountPageC() {
  const content = await getPagesContent();
  return <AccountClientC content={content ?? undefined} />;
}
