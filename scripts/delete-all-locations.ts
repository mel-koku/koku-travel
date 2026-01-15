#!/usr/bin/env tsx
// Load environment variables from .env.local FIRST
import { config } from "dotenv";
config({ path: ".env.local" });

import { getServiceRoleClient } from "@/lib/supabase/serviceRole";

async function deleteAllLocations() {
  console.log("Deleting all locations...");

  const supabase = getServiceRoleClient();

  const { error } = await supabase
    .from("locations")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

  if (error) {
    console.error("Error:", error);
    process.exit(1);
  }

  console.log("✅ All locations deleted successfully");
}

deleteAllLocations();
