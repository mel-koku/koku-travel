#!/usr/bin/env tsx
/**
 * Fix remaining duplicate entries
 */

import { config } from "dotenv";
config({ path: ".env.local", debug: false });

import { createClient } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: Missing env vars");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const isDryRun = process.argv.includes("--dry-run");
const doFix = process.argv.includes("--fix");

async function main() {
  // Check Hiroshima Castle entries
  const { data: entries } = await supabase
    .from("locations")
    .select("id, name, description, category, place_id, rating, review_count")
    .or("id.eq.hiroshima-castle-chugoku-607c86d5,id.eq.hiroshima-chugoku-c9e30bac");

  console.log("=== Hiroshima Castle Entries ===\n");
  for (const loc of entries || []) {
    console.log("ID:", loc.id);
    console.log("Name:", loc.name);
    console.log("Category:", loc.category);
    console.log("Description:", (loc.description || "").slice(0, 150) + "...");
    console.log("Has place_id:", !!loc.place_id);
    console.log("Rating:", loc.rating, "| Reviews:", loc.review_count);
    console.log("");
  }

  if (!doFix) {
    console.log("Run with --fix to delete the duplicate");
    return;
  }

  // Keep hiroshima-castle-chugoku-607c86d5 (has "castle" in ID, more specific)
  // Delete hiroshima-chugoku-c9e30bac (generic ID)
  const keepId = "hiroshima-castle-chugoku-607c86d5";
  const deleteId = "hiroshima-chugoku-c9e30bac";

  // Check which has better data
  const keepEntry = entries?.find(e => e.id === keepId);
  const deleteEntry = entries?.find(e => e.id === deleteId);

  if (!keepEntry) {
    console.log("Keep entry not found!");
    return;
  }

  if (!deleteEntry) {
    console.log("Delete entry already removed");
    return;
  }

  // Copy valuable data from delete entry to keep entry if missing
  const updates: Record<string, unknown> = {};

  // Copy place_id if keep entry is missing it
  if (deleteEntry.place_id && !keepEntry.place_id) {
    updates.place_id = deleteEntry.place_id;
    console.log("Will copy place_id from duplicate");
  }

  // Copy description if delete entry has a better one
  if (deleteEntry.description && deleteEntry.description.length > (keepEntry.description?.length || 0)) {
    updates.description = deleteEntry.description;
    console.log("Will copy better description from duplicate");
  }

  if (Object.keys(updates).length > 0) {
    console.log("Copying data from duplicate...");
    const { error } = await supabase
      .from("locations")
      .update(updates)
      .eq("id", keepId);

    if (error) {
      console.log("Error copying data:", error.message);
    } else {
      console.log("Data copied successfully:", Object.keys(updates).join(", "));
    }
  }

  console.log(`\nDeleting duplicate: ${deleteId}`);
  const { error: deleteError } = await supabase
    .from("locations")
    .delete()
    .eq("id", deleteId);

  if (deleteError) {
    console.log("Error deleting:", deleteError.message);
  } else {
    console.log("Successfully deleted duplicate!");
  }
}

main().catch(console.error);
