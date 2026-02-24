import type { Metadata } from "next";
import { AccountClientB } from "@/components-b/features/account/AccountClientB";
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

export default async function AccountPageB() {
  const content = await getPagesContent();
  return <AccountClientB content={content ?? undefined} />;
}
