#!/usr/bin/env tsx
/**
 * Environment Variables Verification Script
 * 
 * This script helps verify that all required environment variables are set correctly.
 * Run this locally to check your .env.local file, or use it as a reference
 * for verifying variables in Vercel Dashboard.
 * 
 * Usage:
 *   tsx scripts/verify-env-vars.ts
 */

import { readFileSync } from "fs";
import { join } from "path";

// Required environment variables
const REQUIRED_VARS = {
  // Supabase (3 required)
  "NEXT_PUBLIC_SUPABASE_URL": {
    required: true,
    description: "Supabase project URL",
    example: "https://xxxxx.supabase.co",
    whereToFind: "Supabase Dashboard → Project Settings → API → Project URL",
    sensitive: false,
  },
  "NEXT_PUBLIC_SUPABASE_ANON_KEY": {
    required: true,
    description: "Supabase anonymous/public key",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    whereToFind: "Supabase Dashboard → Project Settings → API → anon public key",
    sensitive: false,
  },
  "SUPABASE_SERVICE_ROLE_KEY": {
    required: true,
    description: "Supabase service role key (server-side only)",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    whereToFind: "Supabase Dashboard → Project Settings → API → service_role secret key",
    sensitive: true,
  },

  // Sanity Server-side (5 required)
  "SANITY_PROJECT_ID": {
    required: true,
    description: "Sanity project ID",
    example: "abc123xyz",
    whereToFind: "Sanity Dashboard → Project Settings → Project ID",
    sensitive: false,
  },
  "SANITY_DATASET": {
    required: true,
    description: "Sanity dataset name",
    example: "production",
    whereToFind: "Sanity Dashboard → Datasets",
    sensitive: false,
  },
  "SANITY_API_READ_TOKEN": {
    required: true,
    description: "Sanity API read token",
    example: "skAbCdEfGhIjKlMnOpQrStUvWxYz...",
    whereToFind: "Sanity Dashboard → Project Settings → API → Tokens → Create Read Token",
    sensitive: true,
  },
  "SANITY_API_VERSION": {
    required: true,
    description: "Sanity API version",
    example: "2024-10-21",
    whereToFind: "Fixed value - use exactly: 2024-10-21",
    sensitive: false,
  },
  "SANITY_REVALIDATE_SECRET": {
    required: true,
    description: "Sanity revalidate secret (for webhooks)",
    example: "random-string-here",
    whereToFind: "Generate with: openssl rand -hex 32",
    sensitive: true,
  },

  // Sanity Client-side (3 required)
  "NEXT_PUBLIC_SANITY_PROJECT_ID": {
    required: true,
    description: "Sanity project ID (client-side)",
    example: "abc123xyz",
    whereToFind: "Same as SANITY_PROJECT_ID above",
    sensitive: false,
  },
  "NEXT_PUBLIC_SANITY_DATASET": {
    required: true,
    description: "Sanity dataset name (client-side)",
    example: "production",
    whereToFind: "Same as SANITY_DATASET above",
    sensitive: false,
  },
  "NEXT_PUBLIC_SANITY_API_VERSION": {
    required: true,
    description: "Sanity API version (client-side)",
    example: "2024-10-21",
    whereToFind: "Fixed value - use exactly: 2024-10-21 (or 2025-11-13 per docs)",
    sensitive: false,
  },
} as const;

// Optional but recommended variables
const OPTIONAL_VARS = {
  "NEXT_PUBLIC_SITE_URL": {
    description: "Site URL (set after first deployment)",
    example: "https://koku-travel.vercel.app",
    whereToFind: "Set after first Vercel deployment with your actual URL",
  },
  "GOOGLE_PLACES_API_KEY": {
    description: "Google Places API key (optional)",
    example: "AIzaSy...",
    whereToFind: "Google Cloud Console → APIs & Services → Credentials",
  },
  "ROUTING_PROVIDER": {
    description: "Routing provider (optional)",
    example: "mapbox",
    whereToFind: "Set to 'mapbox' if using Mapbox routing",
  },
  "ROUTING_MAPBOX_ACCESS_TOKEN": {
    description: "Mapbox access token (optional)",
    example: "pk.eyJ1Ijoi...",
    whereToFind: "Mapbox Dashboard → Access Tokens",
  },
} as const;

function checkLocalEnvFile(): void {
  console.log("📋 Checking local .env.local file...\n");

  const envPath = join(process.cwd(), ".env.local");
  let envContent = "";

  try {
    envContent = readFileSync(envPath, "utf-8");
  } catch (error) {
    console.log("⚠️  .env.local file not found\n");
    console.log("To create it:");
    console.log("  1. Copy env.local.example to .env.local");
    console.log("  2. Fill in your actual values\n");
    return;
  }

  const envVars = new Map<string, string>();
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").trim();
        if (value && !value.startsWith("your_") && !value.startsWith("https://your")) {
          envVars.set(key.trim(), value);
        }
      }
    }
  }

  console.log(`Found ${envVars.size} environment variables in .env.local\n`);

  // Check required variables
  let missingCount = 0;
  let setCount = 0;

  console.log("🔍 Required Variables:\n");
  for (const [key, info] of Object.entries(REQUIRED_VARS)) {
    const value = envVars.get(key);
    if (value && value.length > 0) {
      const displayValue = info.sensitive
        ? `${value.substring(0, 10)}... (hidden)`
        : value.length > 50
          ? `${value.substring(0, 50)}...`
          : value;
      console.log(`  ✅ ${key}`);
      console.log(`     Value: ${displayValue}`);
      setCount++;
    } else {
      console.log(`  ❌ ${key} - MISSING`);
      console.log(`     ${info.description}`);
      console.log(`     Find at: ${info.whereToFind}`);
      missingCount++;
    }
    console.log("");
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Set: ${setCount}/${Object.keys(REQUIRED_VARS).length}`);
  console.log(`  ❌ Missing: ${missingCount}/${Object.keys(REQUIRED_VARS).length}`);

  if (missingCount > 0) {
    console.log(`\n⚠️  ${missingCount} required variable(s) are missing!\n`);
  } else {
    console.log(`\n✅ All required variables are set!\n`);
  }
}

function printVercelInstructions(): void {
  console.log("\n" + "=".repeat(70));
  console.log("📝 VERCEL ENVIRONMENT VARIABLES VERIFICATION GUIDE");
  console.log("=".repeat(70) + "\n");

  console.log("To verify your environment variables in Vercel:\n");

  console.log("1️⃣  Go to Vercel Dashboard:");
  console.log("   https://vercel.com/dashboard\n");

  console.log("2️⃣  Select your project:");
  console.log("   Click on 'koku-travel'\n");

  console.log("3️⃣  Navigate to Environment Variables:");
  console.log("   Settings → Environment Variables\n");

  console.log("4️⃣  Verify each required variable:\n");

  let index = 1;
  for (const [key, info] of Object.entries(REQUIRED_VARS)) {
    console.log(`   ${index}. ${key}`);
    console.log(`      Description: ${info.description}`);
    console.log(`      Where to find: ${info.whereToFind}`);
    if (info.sensitive) {
      console.log(`      ⚠️  Mark as "Sensitive" in Vercel`);
    }
    console.log(`      Scope: Production, Preview, and Development`);
    console.log("");
    index++;
  }

  console.log("\n5️⃣  Check Environment Scope:");
  console.log("   - Each variable should be set for:");
  console.log("     ✅ Production");
  console.log("     ✅ Preview");
  console.log("     ✅ Development");
  console.log("   - Or use 'All Environments' dropdown\n");

  console.log("6️⃣  After adding/changing variables:");
  console.log("   - Click 'Save'");
  console.log("   - Vercel will automatically trigger a new deployment");
  console.log("   - Or manually trigger: Deployments → Redeploy\n");

  console.log("7️⃣  Verify the deployment:");
  console.log("   - Check build logs for any environment variable errors");
  console.log("   - Visit your site: https://koku-travel.vercel.app");
  console.log("   - Check browser console for any missing variable errors\n");

  console.log("=".repeat(70));
  console.log("🔗 Quick Links:");
  console.log("   Vercel Dashboard: https://vercel.com/dashboard");
  console.log("   Project Settings: https://vercel.com/dashboard → Select Project → Settings");
  console.log("   Environment Variables: Settings → Environment Variables");
  console.log("=".repeat(70) + "\n");
}

function printChecklist(): void {
  console.log("\n" + "=".repeat(70));
  console.log("✅ VERIFICATION CHECKLIST");
  console.log("=".repeat(70) + "\n");

  console.log("For each required variable, verify:\n");

  for (const [key, info] of Object.entries(REQUIRED_VARS)) {
    console.log(`[ ] ${key}`);
    console.log(`    ✓ Variable name is exactly: ${key}`);
    console.log(`    ✓ Value is set (not empty)`);
    console.log(`    ✓ Value doesn't contain placeholder text (your_, https://your)`);
    if (info.sensitive) {
      console.log(`    ✓ Marked as "Sensitive" in Vercel`);
    }
    console.log(`    ✓ Scope includes Production environment`);
    console.log("");
  }

  console.log("Additional checks:");
  console.log("[ ] All variables saved in Vercel");
  console.log("[ ] New deployment triggered after adding variables");
  console.log("[ ] Build logs show no environment variable errors");
  console.log("[ ] Site loads without errors");
  console.log("[ ] Browser console shows no missing variable errors\n");
}

// Main execution
console.log("\n" + "=".repeat(70));
console.log("🔍 ENVIRONMENT VARIABLES VERIFICATION");
console.log("=".repeat(70) + "\n");

checkLocalEnvFile();
printVercelInstructions();
printChecklist();

console.log("\n💡 Tip: If variables are set but still getting errors:");
console.log("   1. Ensure variables are set for the correct environment (Production)");
console.log("   2. Trigger a new deployment after adding variables");
console.log("   3. Check for typos in variable names (case-sensitive!)");
console.log("   4. Verify values don't have extra spaces or quotes\n");

