import { draftMode } from "next/headers";
import GuidesShell from "@/components/features/guides/GuidesShell";
import { fetchGuides } from "@/lib/sanity/guides";
import { logger } from "@/lib/logger";
import type { Guide } from "@/types/guide";

// Force dynamic rendering because we use draftMode() which is a dynamic function
export const dynamic = "force-dynamic";
// Revalidate this page every hour, or on-demand via webhook
export const revalidate = 3600;

export default async function GuidesPage() {
  const { isEnabled } = await draftMode();
  let guides: Guide[] = [];
  
  try {
    guides = await fetchGuides({ preview: isEnabled });
  } catch (error) {
    logger.error("Failed to fetch guides", error);
    // Continue with empty array - GuidesShell will handle empty state
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-2 pb-12 sm:pt-4 sm:pb-16">
      <GuidesShell guides={guides} />
    </div>
  );
}


