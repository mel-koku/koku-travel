#!/usr/bin/env node

import { config } from "dotenv";
config({ path: ".env.local" });

// Simulate what the app does
import { createClient } from "@sanity/client";
import { groq } from "next-sanity";

const GUIDE_FIELDS = groq`{
  _id,
  title,
  headline,
  summary,
  categories,
  location,
  featured,
  "slug": slug.current,
  "image": coverImage.asset->url,
  "imageMeta": coverImage.asset->metadata,
  "publishedAt": coalesce(publishedAt, _updatedAt, _createdAt),
  "author": author-> {
    _id,
    name,
    "slug": slug.current,
    bio,
    experience,
    expertise,
    languages,
    "avatar": coalesce(avatar.asset->url, profileImage.asset->url),
    "coverImage": coverImage.asset->url,
    location,
    yearsExperience
  }
}`;

const ALL_GUIDES_QUERY = groq`*[_type == "guide"] | order(publishedAt desc, _createdAt desc) ${GUIDE_FIELDS}`;

async function testFetch() {
  const client = createClient({
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET,
    token: process.env.SANITY_API_READ_TOKEN,
    apiVersion: process.env.SANITY_API_VERSION || "2024-10-21",
    useCdn: false,
    perspective: "published",
  });

  console.log("Testing guide fetch with published perspective...\n");

  try {
    const results = await client.fetch(ALL_GUIDES_QUERY);
    console.log(`✅ Fetched ${results.length} guide(s)\n`);

    // Check which ones would pass mapping
    let validCount = 0;
    for (const guide of results) {
      const slug = guide.slug?.trim();
      const title = guide.title?.trim() || guide.headline?.trim();
      const image = guide.image ?? "";
      const authorName = guide.author?.name?.trim();

      const isValid = slug && title && image && authorName;
      if (isValid) {
        validCount++;
        console.log(`✓ ${title} (${slug})`);
      } else {
        console.log(`✗ ${title || guide._id}`);
        console.log(`  Issues: ${!slug ? "no slug " : ""}${!title ? "no title " : ""}${!image ? "no image " : ""}${!authorName ? "no author " : ""}`);
      }
    }

    console.log(`\n📊 Summary: ${validCount}/${results.length} guides would be displayed`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  }
}

testFetch();

