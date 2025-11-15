#!/usr/bin/env tsx
/**
 * Diagnostic script to test the /api/locations endpoint
 * Run with: tsx scripts/test-explore-api.ts
 */

const API_URL = process.env.API_URL || "http://localhost:3000";

async function testLocationsAPI() {
  console.log("🔍 Testing /api/locations endpoint...\n");
  console.log(`📍 URL: ${API_URL}/api/locations\n`);

  try {
    const response = await fetch(`${API_URL}/api/locations`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Headers:`, Object.fromEntries(response.headers.entries()));
    console.log("");

    const data = await response.json();

    if (response.ok) {
      if (Array.isArray(data.locations)) {
        console.log(`✅ Success! Found ${data.locations.length} locations\n`);
        
        if (data.locations.length === 0) {
          console.log("⚠️  WARNING: API returned empty array");
          console.log("   → Check if locations table has data in Supabase\n");
        } else {
          console.log("📝 Sample location:");
          console.log(JSON.stringify(data.locations[0], null, 2));
        }
      } else {
        console.log("❌ ERROR: Response format is incorrect");
        console.log("   Expected: { locations: [...] }");
        console.log("   Got:", Object.keys(data));
      }
    } else {
      console.log("❌ ERROR: API returned error response");
      console.log("Response:", JSON.stringify(data, null, 2));
      
      if (data.error) {
        console.log(`\n💡 Error message: ${data.error}`);
        if (data.code) {
          console.log(`   Error code: ${data.code}`);
        }
      }
    }
  } catch (error) {
    console.log("❌ ERROR: Failed to fetch from API");
    console.log("Error:", error instanceof Error ? error.message : String(error));
    
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.log("\n💡 Possible causes:");
      console.log("   - Server is not running");
      console.log("   - CORS issue");
      console.log("   - Network connectivity problem");
    }
  }
}

// Run the test
testLocationsAPI().catch(console.error);

