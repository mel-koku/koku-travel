import { draftMode } from "next/headers";
import GuidesShell from "@/components/features/guides/GuidesShell";
import { fetchGuides } from "@/lib/sanity/guides";

export default async function GuidesPage() {
  const { isEnabled } = await draftMode();
  const guides = await fetchGuides({ preview: isEnabled });

  return (
    <main className="min-h-screen bg-gray-50 pt-4 pb-16">
      <GuidesShell guides={guides} />
    </main>
  );
}


