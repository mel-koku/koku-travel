#!/usr/bin/env node

import { createClient } from "@sanity/client";

const GUIDE_SEED = [
  {
    slug: "kyoto-culture",
    name: "Mika Tanaka",
    title: "A Day in Kyoto’s Temples",
    summary: "Discover Kyoto’s timeless shrines, tranquil gardens, and street eats.",
    categories: ["culture"],
    imageUrl: "https://images.pexels.com/photos/2342479/pexels-photo-2342479.jpeg",
    languages: ["English", "Japanese"],
    experience: "Tea ceremony host and licensed Kyoto guide with a focus on temples and heritage craft.",
    featured: true,
  },
  {
    slug: "tokyo-nightlife",
    name: "Kenji Sato",
    title: "Tokyo After Dark",
    summary: "Explore bars, izakayas, and skyline views in Japan’s sleepless city.",
    categories: ["nightlife"],
    imageUrl: "https://cdn.pixabay.com/photo/2021/12/17/10/09/night-6876155_1280.jpg",
    languages: ["English", "Japanese"],
    experience: "Former bartender curating small-group nightlife crawls across Shibuya and Shinjuku.",
    featured: false,
  },
  {
    slug: "hokkaido-food",
    name: "Aya Nakamura",
    title: "Hokkaido for Food Lovers",
    summary: "From soup curry to fresh uni — a culinary trail through the north.",
    categories: ["food"],
    imageUrl: "https://cdn.pixabay.com/photo/2020/04/12/13/03/ramen-5034166_1280.jpg",
    languages: ["English", "Japanese", "Mandarin"],
    experience: "Food writer and ramen tour host covering Sapporo’s seasonal specialties.",
    featured: false,
  },
];

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

async function ensureGuide(client, guide) {
  const existing = await client.fetch(
    `*[_type == "guide" && slug.current == $slug][0]{_id, profileImage}`,
    { slug: guide.slug },
  );

  let assetRef = existing?.profileImage?.asset?._ref;

  if (!assetRef) {
    const response = await fetch(guide.imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image for ${guide.slug}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const asset = await client.assets.upload(
      "image",
      Buffer.from(arrayBuffer),
      { filename: `${guide.slug}.jpg` },
    );
    assetRef = asset._id;
  }

  const doc = {
    _type: "guide",
    _id: `guide-${guide.slug}`,
    name: guide.name,
    headline: guide.title,
    summary: guide.summary,
    categories: guide.categories,
    slug: { _type: "slug", current: guide.slug },
    profileImage: {
      _type: "image",
      asset: { _type: "reference", _ref: assetRef },
    },
    languages: guide.languages,
    experience: guide.experience,
    featured: guide.featured ?? false,
  };

  await client.createOrReplace(doc);
  console.log(`✓ Upserted guide: ${guide.slug}`);
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

  for (const guide of GUIDE_SEED) {
    await ensureGuide(client, guide);
  }

  console.log("Seed complete.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

