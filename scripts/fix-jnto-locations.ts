#!/usr/bin/env tsx
/**
 * Fix JNTO locations with truncated names and wrong regions
 *
 * This script:
 * 1. Fetches all locations without place_id
 * 2. Re-fetches their JNTO source URLs
 * 3. Extracts correct name and region from the page
 * 4. Updates the database
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import axios from "axios";
import * as cheerio from "cheerio";

const RATE_LIMIT_MS = 1500;

// Prefecture to region mapping
const prefectureToRegion: Record<string, string> = {
  "Hokkaido": "Hokkaido",
  "Aomori": "Tohoku", "Iwate": "Tohoku", "Miyagi": "Tohoku",
  "Akita": "Tohoku", "Yamagata": "Tohoku", "Fukushima": "Tohoku",
  "Tokyo": "Kanto", "Kanagawa": "Kanto", "Chiba": "Kanto",
  "Saitama": "Kanto", "Ibaraki": "Kanto", "Tochigi": "Kanto", "Gunma": "Kanto",
  "Niigata": "Chubu", "Toyama": "Chubu", "Ishikawa": "Chubu",
  "Fukui": "Chubu", "Yamanashi": "Chubu", "Nagano": "Chubu",
  "Gifu": "Chubu", "Shizuoka": "Chubu", "Aichi": "Chubu",
  "Mie": "Kansai", "Shiga": "Kansai", "Kyoto": "Kansai",
  "Osaka": "Kansai", "Hyogo": "Kansai", "Nara": "Kansai", "Wakayama": "Kansai",
  "Tottori": "Chugoku", "Shimane": "Chugoku", "Okayama": "Chugoku",
  "Hiroshima": "Chugoku", "Yamaguchi": "Chugoku",
  "Tokushima": "Shikoku", "Kagawa": "Shikoku", "Ehime": "Shikoku", "Kochi": "Shikoku",
  "Fukuoka": "Kyushu", "Saga": "Kyushu", "Nagasaki": "Kyushu",
  "Kumamoto": "Kyushu", "Oita": "Kyushu", "Miyazaki": "Kyushu",
  "Kagoshima": "Kyushu",
  "Okinawa": "Okinawa",
};

// City to region mapping for common cities
const cityToRegion: Record<string, string> = {
  "Sapporo": "Hokkaido", "Hakodate": "Hokkaido", "Otaru": "Hokkaido",
  "Asahikawa": "Hokkaido", "Kushiro": "Hokkaido", "Obihiro": "Hokkaido",
  "Kitami": "Hokkaido", "Monbetsu": "Hokkaido", "Mombetsu": "Hokkaido",
  "Abashiri": "Hokkaido", "Wakkanai": "Hokkaido", "Furano": "Hokkaido",
  "Biei": "Hokkaido", "Noboribetsu": "Hokkaido", "Niseko": "Hokkaido",
  "Shakotan": "Hokkaido", "Akan": "Hokkaido",
  "Kyoto": "Kansai", "Osaka": "Kansai", "Nara": "Kansai", "Kobe": "Kansai",
  "Ako": "Kansai", "Himeji": "Kansai",
  "Yakushima": "Kyushu", "Kagoshima": "Kyushu",
};

// Known location fixes
const knownFixes: Record<string, { name: string; region: string; city?: string }> = {
  "https://www.japan.travel/en/spot/25/": { name: "Otaue Rice Planting Festival", region: "Kansai", city: "Osaka" },
  "https://www.japan.travel/en/spot/74/": { name: "Mifune Matsuri Festival", region: "Kansai", city: "Kyoto" },
  "https://www.japan.travel/en/spot/80/": { name: "Okera Mairi (New Year's Eve Fire Festival)", region: "Kansai", city: "Kyoto" },
  "https://www.japan.travel/en/spot/88/": { name: "Jidai Matsuri (Festival of Ages)", region: "Kansai", city: "Kyoto" },
  "https://www.japan.travel/en/spot/105/": { name: "Kumano Fireworks Festival", region: "Kansai", city: "Kumano" },
  "https://www.japan.travel/en/spot/198/": { name: "Yoshida Fire Festival", region: "Chubu", city: "Fujiyoshida" },
  "https://www.japan.travel/en/spot/252/": { name: "19th Century Hall (Meiji-mura)", region: "Chubu", city: "Inuyama" },
  "https://www.japan.travel/en/spot/307/": { name: "Hatsuichi (First Market Festival)", region: "Kanto", city: "Maebashi" },
  "https://www.japan.travel/en/spot/372/": { name: "Ako Gishi-sai (47 Ronin Festival)", region: "Kansai", city: "Ako" },
  "https://www.japan.travel/en/spot/538/": { name: "Marimo Festival (Lake Akan)", region: "Hokkaido", city: "Kushiro" },
  "https://www.japan.travel/en/spot/541/": { name: "Kachimai (Obihiro Ice Festival)", region: "Hokkaido", city: "Obihiro" },
  "https://www.japan.travel/en/spot/556/": { name: "Zamami Island", region: "Okinawa", city: "Zamami" },
  "https://www.japan.travel/en/spot/561/": { name: "Aka Island (Kerama Islands)", region: "Okinawa", city: "Zamami" },
  "https://www.japan.travel/en/spot/569/": { name: "Kohama Island (Yaeyama Islands)", region: "Okinawa", city: "Taketomi" },
  "https://www.japan.travel/en/spot/594/": { name: "Yakushima Island", region: "Kyushu", city: "Yakushima" },
  "https://www.japan.travel/en/spot/610/": { name: "Yoron Island (Southern Paradise)", region: "Kyushu", city: "Yoron" },
  "https://www.japan.travel/en/spot/876/": { name: "Shimanami Kaido (Cycling Route)", region: "Chugoku", city: "Onomichi" },
  "https://www.japan.travel/en/spot/1311/": { name: "Gotemba 5th Station (Mt. Fuji)", region: "Chubu", city: "Gotemba" },
  "https://www.japan.travel/en/spot/1324/": { name: "Hirayama Ikuo Silk Road Museum", region: "Chubu", city: "Hokuto" },
  "https://www.japan.travel/en/spot/1448/": { name: "Ketto Hamlet (Traditional Village)", region: "Chubu", city: "Tsunan" },
  "https://www.japan.travel/en/spot/1848/": { name: "Aomori Bay Bridge", region: "Tohoku", city: "Aomori" },
  "https://www.japan.travel/en/spot/1918/": { name: "Sapporo White Illumination", region: "Hokkaido", city: "Sapporo" },
  "https://www.japan.travel/en/spot/1939/": { name: "Shakotan Peninsula", region: "Hokkaido", city: "Shakotan" },
  "https://www.japan.travel/en/spot/1997/": { name: "Mt. Shigi (Shigisan)", region: "Kansai", city: "Heguri" },
  "https://www.japan.travel/en/spot/2145/": { name: "Mombetsu (Drift Ice & Garinko)", region: "Hokkaido", city: "Mombetsu" },
  "https://www.japan.travel/en/spot/2151/": { name: "Kitami (Peppermint & Onions)", region: "Hokkaido", city: "Kitami" },
  "https://www.japan.travel/en/spot/2293/": { name: "Teiko Shiotani Memorial Museum", region: "Chugoku", city: "Kotoura" },
};

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPageData(url: string): Promise<{ name: string; region: string; description?: string } | null> {
  // Check known fixes first
  if (knownFixes[url]) {
    return knownFixes[url];
  }

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KokuTravelBot/1.0)",
        "Accept": "text/html",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);

    // Get full h1 text
    const h1Text = $("h1").first().text().trim();

    // Try to get English name (before Japanese)
    let name = h1Text;
    if (h1Text.includes(" ")) {
      // Check if there's Japanese text (contains CJK characters)
      const hasJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(h1Text);
      if (hasJapanese) {
        // Split on Japanese characters
        const parts = h1Text.split(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]+/);
        name = parts[0]?.trim() || h1Text;
      }
    }

    // Get description
    const description = $('meta[property="og:description"]').attr("content") ||
                       $('meta[name="description"]').attr("content") || "";

    // Infer region from page content
    let region = "Unknown";
    const pageText = $("body").text();

    // Check prefectures in content
    for (const [pref, reg] of Object.entries(prefectureToRegion)) {
      if (pageText.includes(pref + " Prefecture") || pageText.includes(pref + "-ken")) {
        region = reg;
        break;
      }
    }

    // Check cities if no prefecture found
    if (region === "Unknown") {
      for (const [city, reg] of Object.entries(cityToRegion)) {
        if (pageText.includes(city)) {
          region = reg;
          break;
        }
      }
    }

    // Check breadcrumbs
    if (region === "Unknown") {
      const breadcrumbs = $("nav[aria-label='breadcrumb'] a, .breadcrumb a").text();
      for (const [pref, reg] of Object.entries(prefectureToRegion)) {
        if (breadcrumbs.includes(pref)) {
          region = reg;
          break;
        }
      }
    }

    return { name, region, description };
  } catch (error) {
    console.error(`  Failed to fetch ${url}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function fixLocations() {
  console.log("=".repeat(80));
  console.log("FIX JNTO LOCATIONS - Names & Regions");
  console.log("=".repeat(80));
  console.log("");

  // Import Supabase client
  const { getServiceRoleClient } = await import("@/lib/supabase/serviceRole");
  const supabase = getServiceRoleClient();

  // Fetch locations without place_id
  console.log("Fetching locations without place_id...");
  const { data: locations, error } = await supabase
    .from("locations")
    .select("id, name, city, region, seed_source_url")
    .is("place_id", null)
    .eq("seed_source", "jnto");

  if (error) {
    console.error("Error fetching locations:", error);
    process.exit(1);
  }

  if (!locations || locations.length === 0) {
    console.log("No locations to fix!");
    return;
  }

  console.log(`Found ${locations.length} locations to fix`);
  console.log("");

  let fixed = 0;
  let failed = 0;

  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    if (!loc) continue;

    const url = loc.seed_source_url;
    console.log(`[${i + 1}/${locations.length}] ${loc.name}`);
    console.log(`  URL: ${url}`);

    // Get correct data
    const pageData = url ? await fetchPageData(url) : null;

    if (pageData && (pageData.name !== loc.name || pageData.region !== loc.region)) {
      console.log(`  ✓ Fixing: "${loc.name}" → "${pageData.name}"`);
      console.log(`    Region: ${loc.region} → ${pageData.region}`);

      // Update database
      const { error: updateError } = await supabase
        .from("locations")
        .update({
          name: pageData.name,
          region: pageData.region,
        })
        .eq("id", loc.id);

      if (updateError) {
        console.error(`  ✗ Update failed:`, updateError.message);
        failed++;
      } else {
        fixed++;
      }
    } else if (pageData) {
      console.log(`  - No changes needed`);
    } else {
      console.log(`  ✗ Could not fetch page data`);
      failed++;
    }

    // Rate limit
    if (i < locations.length - 1) {
      await delay(RATE_LIMIT_MS);
    }
  }

  console.log("");
  console.log("=".repeat(80));
  console.log("COMPLETE");
  console.log("=".repeat(80));
  console.log(`Fixed: ${fixed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Unchanged: ${locations.length - fixed - failed}`);
}

fixLocations()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
