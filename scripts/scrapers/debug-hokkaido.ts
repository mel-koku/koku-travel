#!/usr/bin/env tsx
/**
 * Debug script to inspect the Hokkaido website HTML structure
 */

import axios from "axios";
import * as cheerio from "cheerio";

async function debugHokkaidoPage() {
  const url = "https://www.visit-hokkaido.jp/en/spot/index.html";
  console.log(`Fetching: ${url}\n`);

  const response = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; KokuTravelBot/1.0; +https://koku.travel)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    timeout: 30000,
  });

  const $ = cheerio.load(response.data);

  console.log("=== Page Analysis ===\n");

  // Check for links with "spot" in them
  const spotLinks = $('a[href*="spot"]');
  console.log(`Total links with "spot": ${spotLinks.length}`);

  // Check for links with "detail" in them
  const detailLinks = $('a[href*="detail"]');
  console.log(`Total links with "detail": ${detailLinks.length}`);

  // Check for links with both "spot" and "detail"
  const spotDetailLinks = $('a[href*="spot"][href*="detail"]');
  console.log(`Total links with "spot" AND "detail": ${spotDetailLinks.length}`);

  // Print first 10 links
  console.log("\n=== First 10 Links ===");
  $("a")
    .slice(0, 10)
    .each((i, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim().substring(0, 50);
      console.log(`${i + 1}. ${href} - ${text}`);
    });

  // Look for common container patterns
  console.log("\n=== Common Container Classes ===");
  const commonClasses = [
    ".spot-item",
    ".attraction",
    ".location",
    ".card",
    ".item",
    ".list-item",
    "article",
    ".place",
  ];

  for (const className of commonClasses) {
    const count = $(className).length;
    if (count > 0) {
      console.log(`${className}: ${count} elements`);
    }
  }

  // Check for list structures
  console.log("\n=== List Structures ===");
  console.log(`<ul> elements: ${$("ul").length}`);
  console.log(`<ol> elements: ${$("ol").length}`);
  console.log(`<li> elements: ${$("li").length}`);
  console.log(`<article> elements: ${$("article").length}`);

  // Print all unique hrefs that contain "spot"
  console.log("\n=== Sample Spot Links ===");
  const uniqueHrefs = new Set<string>();
  $('a[href*="spot"]')
    .slice(0, 20)
    .each((i, el) => {
      const href = $(el).attr("href");
      if (href) uniqueHrefs.add(href);
    });

  Array.from(uniqueHrefs)
    .slice(0, 10)
    .forEach((href) => {
      console.log(`  ${href}`);
    });

  // Check the page title
  console.log(`\n=== Page Title ===`);
  console.log($("title").text());

  // Save HTML to file for inspection
  const fs = await import("fs");
  fs.writeFileSync("tmp/hokkaido-debug.html", response.data, "utf-8");
  console.log("\n✅ Saved HTML to tmp/hokkaido-debug.html for inspection");
}

debugHokkaidoPage().catch(console.error);
