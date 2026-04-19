import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { LaunchBanner } from "./LaunchBanner";

async function getInitialSlots(): Promise<{
  remaining: number | null;
  total: number | null;
}> {
  try {
    const supabase = getServiceRoleClient();
    const { data } = await supabase
      .from("launch_pricing")
      .select("remaining_slots, total_slots")
      .eq("id", "default")
      .single();
    if (!data) return { remaining: null, total: null };
    return { remaining: data.remaining_slots, total: data.total_slots };
  } catch {
    return { remaining: null, total: null };
  }
}

export async function LaunchBannerServer() {
  if (process.env.NEXT_PUBLIC_FREE_FULL_ACCESS !== "true") return null;
  const { remaining, total } = await getInitialSlots();
  if (remaining === null || total === null) return null;
  return (
    <>
      <style>{`
        header.fixed { top: 2.5rem; }
        @media (min-width: 640px) { header.fixed { top: 2.25rem; } }
      `}</style>
      <LaunchBanner initialRemaining={remaining} initialTotal={total} />
    </>
  );
}
