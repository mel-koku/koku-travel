#!/usr/bin/env tsx
import { config } from "dotenv";
config({ path: ".env.local" });

import { getServiceRoleClient } from "@/lib/supabase/serviceRole";

async function checkCount() {
  const supabase = getServiceRoleClient();

  const { count, error } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error:", error);
    process.exit(1);
  }

  console.log("Current location count:", count);

  if (count && count > 0) {
    const { data } = await supabase
      .from("locations")
      .select("id, name")
      .limit(5);

    console.log("\nSample locations:");
    data?.forEach(loc => console.log(`- ${loc.id}: ${loc.name}`));
  }
}

checkCount();
