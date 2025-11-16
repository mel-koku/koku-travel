#!/usr/bin/env node

/**
 * Script to clear all Koku Travel local storage data
 * 
 * Usage:
 *   1. Browser Console: Copy and paste the code below into your browser console
 *   2. Node.js: Run `node scripts/clear-local-storage.js` (will output instructions)
 */

const STORAGE_KEYS = [
  "koku_app_state_v1",
  "koku_wishlist",
  "koku_trip_builder",
  "koku_trip_step",
  // Community-related keys (pattern-based)
  // These will be cleared by pattern matching
];

// Pattern-based keys (will be cleared by matching prefix)
const KEY_PATTERNS = [
  "koku_community_replies_v1_",
  "koku_community_name",
];

function clearLocalStorage() {
  if (typeof window === "undefined") {
    console.log("❌ This script must be run in a browser environment.");
    console.log("\n📋 To clear localStorage, open your browser console and run:");
    console.log("\n" + getBrowserScript());
    return;
  }

  console.log("🧹 Clearing Koku Travel local storage...\n");

  let clearedCount = 0;

  // Clear known keys
  STORAGE_KEYS.forEach((key) => {
    if (window.localStorage.getItem(key)) {
      window.localStorage.removeItem(key);
      console.log(`✅ Cleared: ${key}`);
      clearedCount++;
    }
  });

  // Clear pattern-based keys
  const keysToRemove = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && KEY_PATTERNS.some((pattern) => key.startsWith(pattern))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => {
    window.localStorage.removeItem(key);
    console.log(`✅ Cleared: ${key}`);
    clearedCount++;
  });

  // Clear any other koku-related keys (catch-all)
  const remainingKokuKeys = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.toLowerCase().includes("koku")) {
      remainingKokuKeys.push(key);
    }
  }

  remainingKokuKeys.forEach((key) => {
    window.localStorage.removeItem(key);
    console.log(`✅ Cleared: ${key}`);
    clearedCount++;
  });

  if (clearedCount === 0) {
    console.log("ℹ️  No Koku Travel data found in localStorage.");
  } else {
    console.log(`\n✨ Successfully cleared ${clearedCount} localStorage item(s)!`);
    console.log("🔄 Please refresh your browser to see the changes.");
  }
}

function getBrowserScript() {
  return `
// Clear all Koku Travel localStorage data
const keys = [
  "koku_app_state_v1",
  "koku_wishlist", 
  "koku_trip_builder",
  "koku_trip_step"
];

const patterns = [
  "koku_community_replies_v1_",
  "koku_community_name"
];

let count = 0;

// Clear known keys
keys.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log("✅ Cleared:", key);
    count++;
  }
});

// Clear pattern-based keys
const allKeys = Object.keys(localStorage);
allKeys.forEach(key => {
  if (patterns.some(p => key.startsWith(p)) || key.toLowerCase().includes("koku")) {
    localStorage.removeItem(key);
    console.log("✅ Cleared:", key);
    count++;
  }
});

console.log("✨ Cleared", count, "item(s). Refresh the page!");
`;
}

// If running in Node.js, output browser script
if (typeof window === "undefined") {
  console.log("📋 Browser Console Script:");
  console.log("=" .repeat(50));
  console.log(getBrowserScript());
  console.log("=" .repeat(50));
  console.log("\n💡 Copy the script above and paste it into your browser console.");
} else {
  // Running in browser
  clearLocalStorage();
}

// Export for use as module
if (typeof module !== "undefined" && module.exports) {
  module.exports = { clearLocalStorage, getBrowserScript };
}

