#!/usr/bin/env tsx
import { config } from "dotenv";
config({ path: ".env.local" });

const CATEGORY_TEMPLATES: Record<string, string> = {
  culture: "Cultural attraction in {city} showcasing traditional Japanese heritage.",
  nature: "Natural attraction in {city} featuring scenic landscapes.",
  food: "Popular dining destination in {city} known for local cuisine.",
  shopping: "Shopping destination in {city} with local goods and souvenirs.",
  attraction: "Popular attraction in {city} offering memorable experiences.",
};

const DEFAULT = "Notable destination in {city} worth visiting during your trip.";

async function fix() {
  const { getServiceRoleClient } = await import("@/lib/supabase/serviceRole");
  const supabase = getServiceRoleClient();

  // Get ALL locations without descriptions directly from DB
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, category, city, short_description")
    .or("short_description.is.null,short_description.eq.");

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  console.log(`Found ${data?.length || 0} locations without descriptions`);

  for (const loc of data || []) {
    const template = CATEGORY_TEMPLATES[loc.category?.toLowerCase()] || DEFAULT;
    const desc = template.replace("{city}", loc.city || "Japan");

    await supabase
      .from("locations")
      .update({ short_description: desc })
      .eq("id", loc.id);
  }

  // Verify
  const { count } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true })
    .or("short_description.is.null,short_description.eq.");

  console.log(`Remaining without descriptions: ${count}`);
}

fix().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
