#!/usr/bin/env tsx
/**
 * Seed script to populate the airports table in Supabase with Japanese airports.
 *
 * Usage:
 *   npx tsx scripts/seed-airports.ts
 *
 * Requires:
 *   - SUPABASE_SERVICE_ROLE_KEY environment variable (in .env.local)
 *   - NEXT_PUBLIC_SUPABASE_URL environment variable (in .env.local)
 */

// Load environment variables from .env.local FIRST, before any other imports
import { config } from "dotenv";
const result = config({ path: ".env.local" });

if (result.error) {
  console.error("Failed to load .env.local:", result.error);
  process.exit(1);
}

// Verify the key is loaded
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is still missing after loading .env.local");
  console.log("Available SUPABASE vars:", Object.keys(process.env).filter(k => k.includes("SUPABASE")));
  process.exit(1);
}

type Airport = {
  id: string;
  iata_code: string;
  name: string;
  name_ja: string;
  short_name: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  is_international: boolean;
  is_popular: boolean;
};

// Japanese airports data
// Popular airports (is_popular: true) are shown as quick-pick chips
const AIRPORTS: Airport[] = [
  // ===== POPULAR AIRPORTS (shown as chips) =====
  {
    id: "nrt",
    iata_code: "NRT",
    name: "Narita International Airport",
    name_ja: "成田国際空港",
    short_name: "Narita (NRT)",
    city: "Narita",
    region: "Kanto",
    lat: 35.7720,
    lng: 140.3929,
    is_international: true,
    is_popular: true,
  },
  {
    id: "hnd",
    iata_code: "HND",
    name: "Haneda Airport",
    name_ja: "羽田空港",
    short_name: "Haneda (HND)",
    city: "Tokyo",
    region: "Kanto",
    lat: 35.5494,
    lng: 139.7798,
    is_international: true,
    is_popular: true,
  },
  {
    id: "kix",
    iata_code: "KIX",
    name: "Kansai International Airport",
    name_ja: "関西国際空港",
    short_name: "Kansai (KIX)",
    city: "Osaka",
    region: "Kansai",
    lat: 34.4273,
    lng: 135.2441,
    is_international: true,
    is_popular: true,
  },
  {
    id: "ngo",
    iata_code: "NGO",
    name: "Chubu Centrair International Airport",
    name_ja: "中部国際空港",
    short_name: "Centrair (NGO)",
    city: "Nagoya",
    region: "Chubu",
    lat: 34.8584,
    lng: 136.8052,
    is_international: true,
    is_popular: true,
  },
  {
    id: "cts",
    iata_code: "CTS",
    name: "New Chitose Airport",
    name_ja: "新千歳空港",
    short_name: "Chitose (CTS)",
    city: "Sapporo",
    region: "Hokkaido",
    lat: 42.7752,
    lng: 141.6925,
    is_international: true,
    is_popular: true,
  },
  {
    id: "fuk",
    iata_code: "FUK",
    name: "Fukuoka Airport",
    name_ja: "福岡空港",
    short_name: "Fukuoka (FUK)",
    city: "Fukuoka",
    region: "Kyushu",
    lat: 33.5859,
    lng: 130.4511,
    is_international: true,
    is_popular: true,
  },

  // ===== OTHER MAJOR AIRPORTS =====
  {
    id: "itm",
    iata_code: "ITM",
    name: "Osaka International Airport (Itami)",
    name_ja: "大阪国際空港",
    short_name: "Itami (ITM)",
    city: "Osaka",
    region: "Kansai",
    lat: 34.7855,
    lng: 135.4382,
    is_international: false,
    is_popular: false,
  },
  {
    id: "oka",
    iata_code: "OKA",
    name: "Naha Airport",
    name_ja: "那覇空港",
    short_name: "Naha (OKA)",
    city: "Naha",
    region: "Okinawa",
    lat: 26.1958,
    lng: 127.6459,
    is_international: true,
    is_popular: false,
  },
  {
    id: "hij",
    iata_code: "HIJ",
    name: "Hiroshima Airport",
    name_ja: "広島空港",
    short_name: "Hiroshima (HIJ)",
    city: "Hiroshima",
    region: "Chugoku",
    lat: 34.4361,
    lng: 132.9194,
    is_international: true,
    is_popular: false,
  },
  {
    id: "sdj",
    iata_code: "SDJ",
    name: "Sendai Airport",
    name_ja: "仙台空港",
    short_name: "Sendai (SDJ)",
    city: "Sendai",
    region: "Tohoku",
    lat: 38.1397,
    lng: 140.9170,
    is_international: true,
    is_popular: false,
  },
  {
    id: "kmj",
    iata_code: "KMJ",
    name: "Kumamoto Airport",
    name_ja: "熊本空港",
    short_name: "Kumamoto (KMJ)",
    city: "Kumamoto",
    region: "Kyushu",
    lat: 32.8373,
    lng: 130.8551,
    is_international: true,
    is_popular: false,
  },
  {
    id: "oit",
    iata_code: "OIT",
    name: "Oita Airport",
    name_ja: "大分空港",
    short_name: "Oita (OIT)",
    city: "Oita",
    region: "Kyushu",
    lat: 33.4794,
    lng: 131.7372,
    is_international: true,
    is_popular: false,
  },
  {
    id: "myj",
    iata_code: "MYJ",
    name: "Matsuyama Airport",
    name_ja: "松山空港",
    short_name: "Matsuyama (MYJ)",
    city: "Matsuyama",
    region: "Shikoku",
    lat: 33.8272,
    lng: 132.6997,
    is_international: true,
    is_popular: false,
  },
  {
    id: "tak",
    iata_code: "TAK",
    name: "Takamatsu Airport",
    name_ja: "高松空港",
    short_name: "Takamatsu (TAK)",
    city: "Takamatsu",
    region: "Shikoku",
    lat: 34.2142,
    lng: 134.0156,
    is_international: true,
    is_popular: false,
  },
  {
    id: "koj",
    iata_code: "KOJ",
    name: "Kagoshima Airport",
    name_ja: "鹿児島空港",
    short_name: "Kagoshima (KOJ)",
    city: "Kagoshima",
    region: "Kyushu",
    lat: 31.8034,
    lng: 130.7197,
    is_international: true,
    is_popular: false,
  },
  {
    id: "ngs",
    iata_code: "NGS",
    name: "Nagasaki Airport",
    name_ja: "長崎空港",
    short_name: "Nagasaki (NGS)",
    city: "Nagasaki",
    region: "Kyushu",
    lat: 32.9169,
    lng: 129.9136,
    is_international: true,
    is_popular: false,
  },
  {
    id: "asj",
    iata_code: "ASJ",
    name: "Amami Airport",
    name_ja: "奄美空港",
    short_name: "Amami (ASJ)",
    city: "Amami",
    region: "Kyushu",
    lat: 28.4306,
    lng: 129.7125,
    is_international: false,
    is_popular: false,
  },
  {
    id: "isg",
    iata_code: "ISG",
    name: "New Ishigaki Airport",
    name_ja: "新石垣空港",
    short_name: "Ishigaki (ISG)",
    city: "Ishigaki",
    region: "Okinawa",
    lat: 24.3964,
    lng: 124.2450,
    is_international: true,
    is_popular: false,
  },
  {
    id: "mmy",
    iata_code: "MMY",
    name: "Miyako Airport",
    name_ja: "宮古空港",
    short_name: "Miyako (MMY)",
    city: "Miyakojima",
    region: "Okinawa",
    lat: 24.7828,
    lng: 125.2950,
    is_international: false,
    is_popular: false,
  },
  {
    id: "kmi",
    iata_code: "KMI",
    name: "Miyazaki Airport",
    name_ja: "宮崎空港",
    short_name: "Miyazaki (KMI)",
    city: "Miyazaki",
    region: "Kyushu",
    lat: 31.8772,
    lng: 131.4486,
    is_international: true,
    is_popular: false,
  },
  {
    id: "aoj",
    iata_code: "AOJ",
    name: "Aomori Airport",
    name_ja: "青森空港",
    short_name: "Aomori (AOJ)",
    city: "Aomori",
    region: "Tohoku",
    lat: 40.7347,
    lng: 140.6908,
    is_international: true,
    is_popular: false,
  },
  {
    id: "akj",
    iata_code: "AKJ",
    name: "Asahikawa Airport",
    name_ja: "旭川空港",
    short_name: "Asahikawa (AKJ)",
    city: "Asahikawa",
    region: "Hokkaido",
    lat: 43.6708,
    lng: 142.4475,
    is_international: true,
    is_popular: false,
  },
  {
    id: "hkd",
    iata_code: "HKD",
    name: "Hakodate Airport",
    name_ja: "函館空港",
    short_name: "Hakodate (HKD)",
    city: "Hakodate",
    region: "Hokkaido",
    lat: 41.7700,
    lng: 140.8220,
    is_international: true,
    is_popular: false,
  },
  {
    id: "mmb",
    iata_code: "MMB",
    name: "Memanbetsu Airport",
    name_ja: "女満別空港",
    short_name: "Memanbetsu (MMB)",
    city: "Ozora",
    region: "Hokkaido",
    lat: 43.8806,
    lng: 144.1642,
    is_international: false,
    is_popular: false,
  },
  {
    id: "obo",
    iata_code: "OBO",
    name: "Tokachi-Obihiro Airport",
    name_ja: "とかち帯広空港",
    short_name: "Obihiro (OBO)",
    city: "Obihiro",
    region: "Hokkaido",
    lat: 42.7333,
    lng: 143.2172,
    is_international: false,
    is_popular: false,
  },
  {
    id: "kuh",
    iata_code: "KUH",
    name: "Kushiro Airport",
    name_ja: "釧路空港",
    short_name: "Kushiro (KUH)",
    city: "Kushiro",
    region: "Hokkaido",
    lat: 43.0411,
    lng: 144.1928,
    is_international: false,
    is_popular: false,
  },
  {
    id: "kmq",
    iata_code: "KMQ",
    name: "Komatsu Airport",
    name_ja: "小松空港",
    short_name: "Komatsu (KMQ)",
    city: "Komatsu",
    region: "Chubu",
    lat: 36.3947,
    lng: 136.4069,
    is_international: true,
    is_popular: false,
  },
  {
    id: "toy",
    iata_code: "TOY",
    name: "Toyama Airport",
    name_ja: "富山空港",
    short_name: "Toyama (TOY)",
    city: "Toyama",
    region: "Chubu",
    lat: 36.6483,
    lng: 137.1875,
    is_international: true,
    is_popular: false,
  },
  {
    id: "ntq",
    iata_code: "NTQ",
    name: "Noto Airport",
    name_ja: "能登空港",
    short_name: "Noto (NTQ)",
    city: "Wajima",
    region: "Chubu",
    lat: 37.2931,
    lng: 136.9619,
    is_international: false,
    is_popular: false,
  },
  {
    id: "okj",
    iata_code: "OKJ",
    name: "Okayama Airport",
    name_ja: "岡山空港",
    short_name: "Okayama (OKJ)",
    city: "Okayama",
    region: "Chugoku",
    lat: 34.7569,
    lng: 133.8553,
    is_international: true,
    is_popular: false,
  },
  {
    id: "ttj",
    iata_code: "TTJ",
    name: "Tottori Sand Dunes Conan Airport",
    name_ja: "鳥取砂丘コナン空港",
    short_name: "Tottori (TTJ)",
    city: "Tottori",
    region: "Chugoku",
    lat: 35.5303,
    lng: 134.1667,
    is_international: false,
    is_popular: false,
  },
  {
    id: "iwj",
    iata_code: "IWJ",
    name: "Iwami Airport",
    name_ja: "萩・石見空港",
    short_name: "Iwami (IWJ)",
    city: "Masuda",
    region: "Chugoku",
    lat: 34.6764,
    lng: 131.7903,
    is_international: false,
    is_popular: false,
  },
  {
    id: "kch",
    iata_code: "KCZ",
    name: "Kochi Ryoma Airport",
    name_ja: "高知龍馬空港",
    short_name: "Kochi (KCZ)",
    city: "Kochi",
    region: "Shikoku",
    lat: 33.5461,
    lng: 133.6694,
    is_international: true,
    is_popular: false,
  },
  {
    id: "tks",
    iata_code: "TKS",
    name: "Tokushima Awaodori Airport",
    name_ja: "徳島阿波おどり空港",
    short_name: "Tokushima (TKS)",
    city: "Tokushima",
    region: "Shikoku",
    lat: 34.1328,
    lng: 134.6067,
    is_international: false,
    is_popular: false,
  },
  {
    id: "niigata",
    iata_code: "KIJ",
    name: "Niigata Airport",
    name_ja: "新潟空港",
    short_name: "Niigata (KIJ)",
    city: "Niigata",
    region: "Chubu",
    lat: 37.9558,
    lng: 139.1211,
    is_international: true,
    is_popular: false,
  },
  {
    id: "shm",
    iata_code: "SHM",
    name: "Nanki-Shirahama Airport",
    name_ja: "南紀白浜空港",
    short_name: "Shirahama (SHM)",
    city: "Shirahama",
    region: "Kansai",
    lat: 33.6622,
    lng: 135.3642,
    is_international: false,
    is_popular: false,
  },
];

async function seedAirports() {
  try {
    console.log("🛫 Starting airports seed...");
    console.log(`📋 Preparing to insert ${AIRPORTS.length} airports\n`);

    // Dynamically import getServiceRoleClient after env vars are loaded
    const { getServiceRoleClient } = await import("@/lib/supabase/serviceRole");
    const supabase = getServiceRoleClient();

    // Check if airports already exist
    const { count, error: countError } = await supabase
      .from("airports")
      .select("*", { count: "exact", head: true });

    if (countError) {
      // Table might not exist yet
      if (countError.code === "42P01") {
        console.error("❌ airports table does not exist.");
        console.log("Run migrations first: npx supabase db push");
        process.exit(1);
      }
      throw countError;
    }

    if (count && count > 0) {
      console.log(`Found ${count} existing airports.`);
      console.log("Do you want to replace them? Use --force flag to overwrite.\n");

      if (!process.argv.includes("--force")) {
        console.log("Skipping seed. Use --force to overwrite existing data.");
        return;
      }

      console.log("--force flag detected. Deleting existing airports...");
      const { error: deleteError } = await supabase
        .from("airports")
        .delete()
        .neq("id", ""); // Delete all rows

      if (deleteError) {
        throw deleteError;
      }
      console.log("✅ Existing airports deleted.\n");
    }

    // Insert airports
    const { error: insertError } = await supabase
      .from("airports")
      .insert(AIRPORTS);

    if (insertError) {
      console.error("❌ Failed to insert airports");
      console.error(`Error: ${insertError.message}`);
      throw insertError;
    }

    // Count popular airports
    const popularCount = AIRPORTS.filter(a => a.is_popular).length;
    const internationalCount = AIRPORTS.filter(a => a.is_international).length;

    console.log(`✅ Successfully seeded ${AIRPORTS.length} airports!`);
    console.log(`   - ${popularCount} popular airports (shown as quick picks)`);
    console.log(`   - ${internationalCount} international airports`);
    console.log(`   - ${AIRPORTS.length - internationalCount} domestic airports`);
    console.log("");
    console.log("Popular airports:");
    AIRPORTS.filter(a => a.is_popular).forEach(a => {
      console.log(`   • ${a.short_name} - ${a.city}, ${a.region}`);
    });

  } catch (error) {
    console.error("Failed to seed airports");
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("Unknown error:", error);
    }
    process.exit(1);
  }
}

// Run if executed directly
seedAirports()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Unhandled error in seed script", error);
    process.exit(1);
  });
