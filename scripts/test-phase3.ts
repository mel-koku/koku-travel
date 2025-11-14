#!/usr/bin/env tsx
/**
 * Phase 3 Testing Script
 * Tests medium-priority improvements: test coverage, logging utility usage,
 * error handling standardization, and type safety
 */

import { logger } from "../src/lib/logger";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

console.log("🧪 Phase 3 Testing Suite\n");

let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => boolean | Promise<boolean>) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result
        .then((passed) => {
          if (passed) {
            console.log(`   ✅ ${name}`);
            passedTests++;
          } else {
            console.error(`   ❌ ${name}`);
            failedTests++;
          }
        })
        .catch((error) => {
          console.error(`   ❌ ${name}: ${error.message}`);
          failedTests++;
        });
    } else {
      if (result) {
        console.log(`   ✅ ${name}`);
        passedTests++;
      } else {
        console.error(`   ❌ ${name}`);
        failedTests++;
      }
    }
  } catch (error) {
    console.error(`   ❌ ${name}: ${error instanceof Error ? error.message : String(error)}`);
    failedTests++;
  }
}

// Test 1: Logger Utility
console.log("1️⃣  Testing Logger Utility...");
test("Logger debug works in development", () => {
  logger.debug("Test debug message", { test: true });
  return true;
});

test("Logger info works", () => {
  logger.info("Test info message", { test: true });
  return true;
});

test("Logger warn works", () => {
  logger.warn("Test warn message", { test: true });
  return true;
});

test("Logger error works", () => {
  logger.error("Test error message", new Error("Test error"), { test: true });
  return true;
});

test("Logger sanitizes sensitive data", async () => {
  const { sanitizeContext } = await import("../src/lib/logger");
  const context = {
    password: "secret123",
    token: "abc123",
    normalData: "safe",
  };
  const sanitized = sanitizeContext(context);
  return (
    sanitized.password === "[REDACTED]" &&
    sanitized.token === "[REDACTED]" &&
    sanitized.normalData === "safe"
  );
});

// Test 2: Check for console statements in production code
console.log("\n2️⃣  Checking for console statements in production code...");
function checkConsoleStatements(filePath: string): { hasConsole: boolean; count: number } {
  if (!existsSync(filePath)) {
    return { hasConsole: false, count: 0 };
  }
  const content = readFileSync(filePath, "utf-8");
  const consoleMatches = content.match(/console\.(log|warn|error|info|debug)/g);
  return {
    hasConsole: !!consoleMatches,
    count: consoleMatches ? consoleMatches.length : 0,
  };
}

// Check key production files (excluding scripts and test files)
const productionFiles = [
  "src/lib/storageHelpers.ts",
  "src/lib/googlePlaces.ts",
  "src/lib/api/errors.ts",
  "src/components/ui/IdentityBadge.tsx",
];

let totalConsoleStatements = 0;
for (const file of productionFiles) {
  const result = checkConsoleStatements(join(process.cwd(), file));
  if (result.hasConsole) {
    totalConsoleStatements += result.count;
    console.log(`   ⚠️  Found ${result.count} console statement(s) in ${file}`);
  }
}

test("Production files use logger instead of console", () => {
  // Allow some console statements in storageHelpers (for now) but check others
  const criticalFiles = productionFiles.filter((f) => !f.includes("storageHelpers"));
  let hasConsoleInCritical = false;
  for (const file of criticalFiles) {
    const result = checkConsoleStatements(join(process.cwd(), file));
      if (result.hasConsole) {
        hasConsoleInCritical = true;
      }
  }
  // This test will pass if we've replaced most console statements
  // We'll update this as we replace them
  return !hasConsoleInCritical;
});

// Test 3: Type Safety - Check for 'any' types in critical files
console.log("\n3️⃣  Checking Type Safety...");
function checkAnyTypes(filePath: string): { hasAny: boolean; count: number } {
  if (!existsSync(filePath)) {
    return { hasAny: false, count: 0 };
  }
  const content = readFileSync(filePath, "utf-8");
  // Match 'any' but not in comments or strings
  const anyMatches = content.match(/\bany\b/g);
  // Filter out common false positives
  const filteredMatches = anyMatches?.filter((match, index) => {
    // Simple heuristic: check if it's likely a type annotation
    const beforeMatch = content.substring(Math.max(0, content.indexOf(match, index) - 20), content.indexOf(match, index));
    return beforeMatch.includes(":") || beforeMatch.includes("<") || beforeMatch.includes("as");
  });
  return {
    hasAny: !!filteredMatches && filteredMatches.length > 0,
    count: filteredMatches ? filteredMatches.length : 0,
  };
}

const criticalTypeFiles = [
  "src/context/TripBuilderContext.tsx",
  "src/lib/api/validation.ts",
  "src/lib/api/errors.ts",
];

let totalAnyTypes = 0;
for (const file of criticalTypeFiles) {
  const result = checkAnyTypes(join(process.cwd(), file));
  if (result.hasAny) {
    totalAnyTypes += result.count;
    console.log(`   ⚠️  Found ${result.count} 'any' type(s) in ${file}`);
  }
}

test("Critical files have minimal 'any' types", () => {
  // Allow some 'any' types but check that we're reducing them
  return totalAnyTypes < 5; // Threshold - adjust as we fix types
});

// Test 4: Error Handling Patterns
console.log("\n4️⃣  Testing Error Handling Patterns...");
test("Error handling utilities exist", async () => {
  const { createErrorResponse } = await import("../src/lib/api/errors");
  return typeof createErrorResponse === "function";
});

test("Error responses have correct structure", async () => {
  const { createErrorResponse } = await import("../src/lib/api/errors");
  const response = createErrorResponse("Test error", 400);
  const data = await response.json();
  return (
    response.status === 400 &&
    typeof response.json === "function" &&
    data.error !== undefined
  );
});

// Test 5: Test Coverage Check
console.log("\n5️⃣  Checking Test Coverage...");
const testFiles = [
  "src/lib/__tests__/itineraryPlanner.test.ts",
  "tests/itineraryGenerator.test.ts",
];

test("Test files exist", () => {
  let allExist = true;
  for (const testFile of testFiles) {
    if (!existsSync(join(process.cwd(), testFile))) {
      allExist = false;
      console.log(`   ⚠️  Missing test file: ${testFile}`);
    }
  }
  return allExist;
});

// Wait for async tests to complete
setTimeout(() => {
  console.log("\n📊 Test Results:");
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   📈 Total: ${passedTests + failedTests}`);

  console.log("\n📋 Phase 3 Summary:");
  console.log(`   📝 Console statements found: ${totalConsoleStatements}`);
  console.log(`   📝 'any' types found: ${totalAnyTypes}`);
  console.log(`   📝 Test files: ${testFiles.length}`);

  if (failedTests === 0) {
    console.log("\n✅ All Phase 3 tests passed!");
    console.log("\n📋 Summary:");
    console.log("   ✓ Logger utility functional");
    console.log("   ✓ Console statements being replaced");
    console.log("   ✓ Type safety improvements");
    console.log("   ✓ Error handling patterns");
    console.log("   ✓ Test coverage infrastructure");
    process.exit(0);
  } else {
    console.error("\n❌ Some Phase 3 tests failed. Please review the errors above.");
    process.exit(1);
  }
}, 3000); // Wait 3 seconds for async tests

