#!/usr/bin/env node

import { config } from "dotenv";
import { createClient } from "@sanity/client";

// Load environment variables from .env.local
config({ path: ".env.local" });

const REQUIRED_ENV = [
  "SANITY_PROJECT_ID",
  "SANITY_DATASET",
  "SANITY_API_WRITE_TOKEN",
  "SANITY_API_VERSION",
];

function getEnvVar(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

async function checkGuides() {
  console.log("🔍 Checking guides in Sanity...\n");

  // Validate environment variables
  for (const key of REQUIRED_ENV) {
    getEnvVar(key);
  }

  const client = createClient({
    projectId: getEnvVar("SANITY_PROJECT_ID"),
    dataset: getEnvVar("SANITY_DATASET"),
    token: getEnvVar("SANITY_API_WRITE_TOKEN"),
    apiVersion: getEnvVar("SANITY_API_VERSION"),
    useCdn: false,
  });

  // Fetch all guides with full details
  const guides = await client.fetch(`
    *[_type == "guide"] {
      _id,
      title,
      headline,
      summary,
      categories,
      location,
      featured,
      "slug": slug.current,
      "coverImageUrl": coverImage.asset->url,
      "hasCoverImage": defined(coverImage),
      "authorName": author->name,
      "authorId": author->_id,
      "hasAuthor": defined(author),
      publishedAt,
      _createdAt,
      _updatedAt
    } | order(_createdAt desc)
  `);

  console.log(`Found ${guides.length} guide document(s) in Sanity\n`);

  if (guides.length === 0) {
    console.log("⚠️  No guides found in Sanity!");
    console.log("   Run the migration script: node scripts/sanity/migrate-all-content.mjs\n");
    return;
  }

  // Check which guides would pass the mapping function
  const validGuides = [];
  const invalidGuides = [];

  for (const guide of guides) {
    const slug = guide.slug?.trim();
    const title = guide.title?.trim() || guide.headline?.trim();
    const image = guide.coverImageUrl ?? "";
    const authorName = guide.authorName?.trim();

    const issues = [];
    if (!slug) issues.push("missing slug");
    if (!title) issues.push("missing title/headline");
    if (!image) issues.push("missing coverImage");
    if (!authorName) issues.push("missing author or author name");

    if (issues.length === 0) {
      validGuides.push(guide);
    } else {
      invalidGuides.push({ guide, issues });
    }
  }

  console.log("✅ Valid guides (will be displayed):");
  console.log(`   ${validGuides.length} guide(s)\n`);
  for (const guide of validGuides) {
    console.log(`   ✓ ${guide.title || guide.headline} (${guide.slug})`);
    console.log(`     Author: ${guide.authorName}`);
    console.log(`     Image: ${guide.hasCoverImage ? "✓" : "✗"} ${guide.coverImageUrl ? "has URL" : "no URL"}`);
  }

  if (invalidGuides.length > 0) {
    console.log("\n❌ Invalid guides (will be filtered out):");
    console.log(`   ${invalidGuides.length} guide(s)\n`);
    for (const { guide, issues } of invalidGuides) {
      console.log(`   ✗ ${guide.title || guide.headline || guide._id}`);
      console.log(`     Slug: ${guide.slug || "MISSING"}`);
      console.log(`     Title: ${guide.title || guide.headline || "MISSING"}`);
      console.log(`     Image: ${guide.hasCoverImage ? "exists" : "MISSING"} ${guide.coverImageUrl || "(no URL)"}`);
      console.log(`     Author: ${guide.hasAuthor ? guide.authorName || "(no name)" : "MISSING"}`);
      console.log(`     Issues: ${issues.join(", ")}`);
      console.log("");
    }
  }

  // Check authors
  console.log("\n👥 Checking authors...");
  const authors = await client.fetch(`
    *[_type == "author"] {
      _id,
      name,
      "slug": slug.current,
      "hasAvatar": defined(avatar),
      "hasBio": defined(bio)
    } | order(name asc)
  `);

  console.log(`Found ${authors.length} author(s)\n`);
  for (const author of authors) {
    console.log(`   ${author.name} (${author.slug})`);
    console.log(`     Avatar: ${author.hasAvatar ? "✓" : "✗"}`);
    console.log(`     Bio: ${author.hasBio ? "✓" : "✗"}`);
  }

  // Check guide-author relationships
  console.log("\n🔗 Checking guide-author relationships...");
  const guidesWithoutAuthors = guides.filter((g) => !g.hasAuthor);
  if (guidesWithoutAuthors.length > 0) {
    console.log(`   ⚠️  ${guidesWithoutAuthors.length} guide(s) without author references:`);
    for (const guide of guidesWithoutAuthors) {
      console.log(`      - ${guide.title || guide.headline || guide._id}`);
    }
  } else {
    console.log("   ✓ All guides have author references");
  }

  const guidesWithBrokenAuthorRefs = guides.filter(
    (g) => g.hasAuthor && !g.authorName
  );
  if (guidesWithBrokenAuthorRefs.length > 0) {
    console.log(`   ⚠️  ${guidesWithBrokenAuthorRefs.length} guide(s) with broken author references:`);
    for (const guide of guidesWithBrokenAuthorRefs) {
      console.log(`      - ${guide.title || guide.headline || guide._id} (author ID: ${guide.authorId})`);
    }
  }
}

checkGuides().catch((error) => {
  console.error("\n❌ Check failed:", error);
  process.exit(1);
});

