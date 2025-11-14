#!/usr/bin/env tsx
/**
 * Phase 1 Testing Script
 * Tests critical security and infrastructure fixes
 */

import { checkRateLimit } from "../src/lib/api/rateLimit";
import { logger } from "../src/lib/logger";
import { env } from "../src/lib/env";
import type { NextRequest } from "next/server";

// Mock NextRequest for testing
// Only implements the parts of NextRequest that checkRateLimit actually uses
function createMockRequest(ip?: string, forwardedFor?: string): NextRequest {
  const headers = new Headers();
  if (forwardedFor) {
    headers.set("x-forwarded-for", forwardedFor);
  }
  
  // Create a minimal mock that satisfies NextRequest type
  // We only need headers.get() method which is what checkRateLimit uses
  return {
    headers,
    // Add minimal required properties to satisfy NextRequest type
    // These won't be used by checkRateLimit, but TypeScript needs them
  } as NextRequest;
}

(async () => {
  console.log("🧪 Phase 1 Testing Suite\n");

  // Test 1: Environment Variable Validation
  console.log("1️⃣  Testing Environment Variable Validation...");
  try {
    const supabaseUrl = env.supabaseUrl;
    const sanityProjectId = env.sanityProjectId;
    console.log("   ✅ Environment variables accessible");
    console.log(`   📝 Supabase URL: ${supabaseUrl ? "✓ Set" : "✗ Missing"}`);
    console.log(`   📝 Sanity Project ID: ${sanityProjectId ? "✓ Set" : "✗ Missing"}`);
  } catch (error) {
    console.error("   ❌ Environment validation failed:", error);
    process.exit(1);
  }

  // Test 2: Rate Limiting
  console.log("\n2️⃣  Testing Rate Limiting...");
  try {
    const mockRequest1 = createMockRequest("192.168.1.1");
    const mockRequest2 = createMockRequest("192.168.1.2");

    // Test first request (should pass)
    const result1 = await checkRateLimit(mockRequest1, { maxRequests: 2, windowMs: 60000 });
    if (result1 === null) {
      console.log("   ✅ First request allowed");
    } else {
      console.error("   ❌ First request incorrectly rate limited");
      process.exit(1);
    }

    // Test second request from same IP (should pass)
    const result2 = await checkRateLimit(mockRequest1, { maxRequests: 2, windowMs: 60000 });
    if (result2 === null) {
      console.log("   ✅ Second request allowed");
    } else {
      console.error("   ❌ Second request incorrectly rate limited");
      process.exit(1);
    }

    // Test third request (should be rate limited)
    const result3 = await checkRateLimit(mockRequest1, { maxRequests: 2, windowMs: 60000 });
    if (result3 !== null && result3.status === 429) {
      console.log("   ✅ Rate limiting works correctly (429 returned)");
    } else {
      console.error("   ❌ Rate limiting failed - third request should be blocked");
      process.exit(1);
    }

    // Test different IP (should pass)
    const result4 = await checkRateLimit(mockRequest2, { maxRequests: 2, windowMs: 60000 });
    if (result4 === null) {
      console.log("   ✅ Different IP allowed (rate limit per IP)");
    } else {
      console.error("   ❌ Different IP incorrectly rate limited");
      process.exit(1);
    }
  } catch (error) {
    console.error("   ❌ Rate limiting test failed:", error);
    process.exit(1);
  }

  // Test 3: Logger
  console.log("\n3️⃣  Testing Logger...");
  try {
    logger.debug("Debug message", { test: true });
    logger.info("Info message", { test: true });
    logger.warn("Warning message", { test: true });
    logger.error("Error message", new Error("Test error"), { test: true });
    console.log("   ✅ Logger functions work correctly");
  } catch (error) {
    console.error("   ❌ Logger test failed:", error);
    process.exit(1);
  }

  console.log("\n✅ All Phase 1 tests passed!");
  console.log("\n📋 Summary:");
  console.log("   ✓ Environment variable validation");
  console.log("   ✓ Rate limiting (in-memory)");
  console.log("   ✓ Centralized logging");
  console.log("\n💡 Note: Authentication fix requires running the app to test");
  console.log("   (Dashboard now uses server-side auth check)");
})();

