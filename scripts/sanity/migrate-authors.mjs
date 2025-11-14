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

async function migrateAuthor(client, author) {
  const updates = {};
  let needsUpdate = false;

  // Migrate experience -> bio
  if (author.experience && !author.bio) {
    updates.bio = author.experience;
    needsUpdate = true;
    console.log(`  → Migrating 'experience' to 'bio'`);
  }

  // Migrate profileImage -> avatar
  if (author.profileImage?.asset && !author.avatar?.asset) {
    updates.avatar = {
      _type: "image",
      asset: {
        _type: "reference",
        _ref: author.profileImage.asset._ref,
      },
    };
    needsUpdate = true;
    console.log(`  → Migrating 'profileImage' to 'avatar'`);
  }

  if (!needsUpdate) {
    console.log(`  ✓ No migration needed`);
    return;
  }

  // Update the document
  await client
    .patch(author._id)
    .set(updates)
    .commit();

  console.log(`  ✓ Migrated successfully`);
}

async function run() {
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

  console.log("Checking what documents exist...");
  
  // Check what document types exist
  const docTypes = await client.fetch(`*[_type == "author" || _type == "guide"] { _type, _id }`);
  const authorsCount = docTypes.filter(d => d._type === "author").length;
  const guidesCount = docTypes.filter(d => d._type === "guide").length;
  console.log(`Found ${authorsCount} author(s) and ${guidesCount} guide(s)\n`);
  
  // Try to fetch authors - check both published and drafts
  let authors = [];
  
  // First try published
  try {
    const published = await client.fetch(`*[_type == "author"]`, {}, {
      perspective: "published",
    });
    authors = published;
  } catch {
    console.log("Note: Could not fetch published authors");
  }
  
  // Also try with raw perspective to get drafts
  try {
    const allAuthors = await client.fetch(`*[_type == "author"]`, {}, {
      perspective: "raw",
    });
    if (allAuthors.length > authors.length) {
      console.log(`Found ${allAuthors.length - authors.length} draft author(s)`);
      authors = allAuthors;
    }
  } catch {
    console.log("Note: Could not fetch all authors");
  }
  
  // Filter and map the fields we need
  authors = authors.map(author => ({
    _id: author._id,
    name: author.name,
    bio: author.bio,
    experience: author.experience,
    avatar: author.avatar,
    profileImage: author.profileImage,
  }));

  if (authors.length === 0) {
    console.log("\n⚠️  No author documents found in Sanity.");
    console.log("The error you're seeing might be from:");
    console.log("  1. Guide documents with embedded author fields (old schema)");
    console.log("  2. Author documents that haven't been created yet");
    console.log("\nIf you see the error in Sanity Studio, please:");
    console.log("  1. Open the document showing the error");
    console.log("  2. Check if it's an 'author' or 'guide' document");
    console.log("  3. If it's an author, manually copy:");
    console.log("     - 'experience' → 'bio' field");
    console.log("     - 'profileImage' → 'avatar' field");
    return;
  }

  console.log(`Found ${authors.length} author(s). Starting migration...\n`);

  for (const author of authors) {
    console.log(`Migrating: ${author.name || author._id}`);
    await migrateAuthor(client, author);
  }

  console.log("\n✓ Migration complete!");
}

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});

