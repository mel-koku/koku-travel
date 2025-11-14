import { draftMode } from "next/headers";
import GuidesShell from "@/components/features/guides/GuidesShell";
import { fetchGuides } from "@/lib/sanity/guides";

// Force dynamic rendering because we use draftMode() which is a dynamic function
export const dynamic = "force-dynamic";
// Revalidate this page every hour, or on-demand via webhook
export const revalidate = 3600;

export default async function GuidesPage() {
  const { isEnabled } = await draftMode();
  const guides = await fetchGuides({ preview: isEnabled });

  return (
    <main className="min-h-screen bg-gray-50 pt-2 pb-12 sm:pt-4 sm:pb-16">
      <GuidesShell guides={guides} />
    </main>
  );
}


