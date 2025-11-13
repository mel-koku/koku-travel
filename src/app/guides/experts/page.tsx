import { draftMode } from "next/headers";
import ExpertsShell from "@/components/features/guides/ExpertsShell";
import { fetchAuthors } from "@/lib/sanity/authors";
import { getAllExperts } from "@/data/mockExperts";

// Revalidate this page every hour, or on-demand via webhook
export const revalidate = 3600;

export default async function ExpertsPage() {
  const { isEnabled } = await draftMode();
  
  // Try to fetch from Sanity first, fallback to mock data
  let experts = await fetchAuthors({ preview: isEnabled });
  
  // If no experts from Sanity, use mock data
  if (experts.length === 0) {
    experts = getAllExperts();
  }

  return (
    <main className="min-h-screen bg-gray-50 pt-4 pb-16">
      <ExpertsShell experts={experts} />
    </main>
  );
}

