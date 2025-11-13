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

// Fallback guides data (from src/lib/sanity/guides.ts)
const FALLBACK_GUIDES = [
  {
    id: "kyoto-culture",
    slug: "kyoto-culture",
    name: "Mika Tanaka",
    title: "A Day in Kyoto's Temples",
    category: "culture",
    categories: ["culture"],
    location: "kyoto",
    summary: "Discover Kyoto's timeless shrines, tranquil gardens, and street eats.",
    image: "https://images.pexels.com/photos/2342479/pexels-photo-2342479.jpeg",
    languages: ["English", "Japanese"],
    featured: true,
    experience: "Tea ceremony host and licensed Kyoto guide with a focus on temples and heritage craft.",
    lastUpdated: null,
  },
  {
    id: "tokyo-nightlife",
    slug: "tokyo-nightlife",
    name: "Kenji Sato",
    title: "Tokyo After Dark",
    category: "nightlife",
    categories: ["nightlife"],
    location: "tokyo",
    summary: "Explore bars, izakayas, and skyline views in Japan's sleepless city.",
    image: "https://images.pexels.com/photos/1591055/pexels-photo-1591055.jpeg?auto=compress&cs=tinysrgb&w=1280",
    languages: ["English", "Japanese"],
    featured: false,
    experience: "Former bartender curating small-group nightlife crawls across Shibuya and Shinjuku.",
    lastUpdated: null,
  },
  {
    id: "hokkaido-food",
    slug: "hokkaido-food",
    name: "Aya Nakamura",
    title: "Hokkaido for Food Lovers",
    category: "food",
    categories: ["food"],
    location: "tokyo",
    summary: "From soup curry to fresh uni — a culinary trail through the north.",
    image: "https://images.pexels.com/photos/725997/pexels-photo-725997.jpeg?auto=compress&cs=tinysrgb&w=1280",
    languages: ["English", "Japanese", "Mandarin"],
    featured: false,
    experience: "Food writer and ramen tour host covering Sapporo's seasonal specialties.",
    lastUpdated: null,
  },
  {
    id: "osaka-street-food",
    slug: "osaka-street-food",
    name: "Aya Nakamura",
    title: "Osaka's Street Food Scene",
    category: "food",
    categories: ["food"],
    location: "osaka",
    summary: "Takoyaki, okonomiyaki, and kushikatsu — your guide to Dotonbori's best bites.",
    image: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1280",
    languages: ["English", "Japanese"],
    featured: false,
    experience: "Food writer and ramen tour host covering Sapporo's seasonal specialties.",
    lastUpdated: null,
  },
  {
    id: "tokyo-cherry-blossoms",
    slug: "tokyo-cherry-blossoms",
    name: "Mika Tanaka",
    title: "Tokyo's Cherry Blossom Season",
    category: "nature",
    categories: ["nature", "culture"],
    location: "tokyo",
    summary: "Best hanami spots, timing tips, and hidden gardens for sakura viewing.",
    image: "https://images.pexels.com/photos/1070536/pexels-photo-1070536.jpeg?auto=compress&cs=tinysrgb&w=1280",
    languages: ["English", "Japanese"],
    featured: false,
    experience: "Tea ceremony host and licensed Kyoto guide with a focus on temples and heritage craft.",
    lastUpdated: null,
  },
  {
    id: "shibuya-izakaya-crawl",
    slug: "shibuya-izakaya-crawl",
    name: "Kenji Sato",
    title: "Shibuya Izakaya Crawl",
    category: "nightlife",
    categories: ["nightlife", "food"],
    location: "tokyo",
    summary: "A night of small plates, sake, and local favorites in Shibuya's backstreets.",
    image: "https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1280",
    languages: ["English", "Japanese"],
    featured: false,
    experience: "Former bartender curating small-group nightlife crawls across Shibuya and Shinjuku.",
    lastUpdated: null,
  },
  {
    id: "japanese-alps-hiking",
    slug: "japanese-alps-hiking",
    name: "Sarah Chen",
    title: "Hiking the Japanese Alps",
    category: "nature",
    categories: ["nature"],
    location: "tokyo",
    summary: "Trail guides, mountain huts, and alpine views in Nagano and Gifu prefectures.",
    image: "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1280",
    languages: ["English", "Mandarin", "Japanese"],
    featured: false,
    experience: "Mountain guide and outdoor photographer specializing in Japan's alpine regions.",
    lastUpdated: null,
  },
  {
    id: "tokyo-temples-shrines",
    slug: "tokyo-temples-shrines",
    name: "Sarah Chen",
    title: "Tokyo's Hidden Temples & Shrines",
    category: "culture",
    categories: ["culture"],
    location: "tokyo",
    summary: "Beyond Senso-ji: discover quiet sanctuaries and neighborhood shrines.",
    image: "https://images.pexels.com/photos/2342479/pexels-photo-2342479.jpeg?auto=compress&cs=tinysrgb&w=1280",
    languages: ["English", "Mandarin"],
    featured: false,
    experience: "Mountain guide and outdoor photographer specializing in Japan's alpine regions.",
    lastUpdated: null,
  },
  {
    id: "kyoto-bamboo-forest",
    slug: "kyoto-bamboo-forest",
    name: "Sarah Chen",
    title: "Arashiyama Bamboo Grove & Beyond",
    category: "nature",
    categories: ["nature", "culture"],
    location: "kyoto",
    summary: "Early morning walks, monkey park, and riverside dining in Arashiyama.",
    image: "https://images.pexels.com/photos/1070536/pexels-photo-1070536.jpeg?auto=compress&cs=tinysrgb&w=1280",
    languages: ["English", "Mandarin", "Japanese"],
    featured: false,
    experience: "Mountain guide and outdoor photographer specializing in Japan's alpine regions.",
    lastUpdated: null,
  },
  {
    id: "tokyo-ramen-tour",
    slug: "tokyo-ramen-tour",
    name: "David Martinez",
    title: "Tokyo Ramen Tour",
    category: "food",
    categories: ["food"],
    location: "tokyo",
    summary: "From tonkotsu to tsukemen — a curated journey through Tokyo's ramen scene.",
    image: "https://images.pexels.com/photos/725997/pexels-photo-725997.jpeg?auto=compress&cs=tinysrgb&w=1280",
    languages: ["English", "Spanish"],
    featured: false,
    experience: "Culinary journalist and ramen enthusiast documenting Tokyo's best bowls.",
    lastUpdated: null,
  },
  {
    id: "osaka-nightlife",
    slug: "osaka-nightlife",
    name: "David Martinez",
    title: "Osaka Nightlife Guide",
    category: "nightlife",
    categories: ["nightlife"],
    location: "osaka",
    summary: "Karaoke bars, tachinomiya, and late-night eats in Namba and Umeda.",
    image: "https://images.pexels.com/photos/1591055/pexels-photo-1591055.jpeg?auto=compress&cs=tinysrgb&w=1280",
    languages: ["English", "Spanish"],
    featured: false,
    experience: "Culinary journalist and ramen enthusiast documenting Tokyo's best bowls.",
    lastUpdated: null,
  },
  {
    id: "tokyo-sushi-omakase",
    slug: "tokyo-sushi-omakase",
    name: "David Martinez",
    title: "Tokyo Sushi Omakase Guide",
    category: "food",
    categories: ["food"],
    location: "tokyo",
    summary: "Where to experience authentic omakase, from Michelin stars to hidden gems.",
    image: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1280",
    languages: ["English", "Spanish", "Japanese"],
    featured: false,
    experience: "Culinary journalist and ramen enthusiast documenting Tokyo's best bowls.",
    lastUpdated: null,
  },
  {
    id: "nara-deer-park",
    slug: "nara-deer-park",
    name: "Emma Thompson",
    title: "Nara Park & Ancient Temples",
    category: "nature",
    categories: ["nature", "culture"],
    location: "nara",
    summary: "Feed the deer, visit Todai-ji, and explore Japan's first permanent capital.",
    image: "https://images.pexels.com/photos/2342479/pexels-photo-2342479.jpeg?auto=compress&cs=tinysrgb&w=1280",
    languages: ["English"],
    featured: false,
    experience: "Travel writer and photographer focusing on Japan's historical sites and natural wonders.",
    lastUpdated: null,
  },
  {
    id: "kyoto-geisha-district",
    slug: "kyoto-geisha-district",
    name: "Emma Thompson",
    title: "Gion & Geisha Culture",
    category: "culture",
    categories: ["culture"],
    location: "kyoto",
    summary: "Evening walks through Gion, traditional architecture, and geisha spotting tips.",
    image: "https://images.pexels.com/photos/2342479/pexels-photo-2342479.jpeg?auto=compress&cs=tinysrgb&w=1280",
    languages: ["English"],
    featured: false,
    experience: "Travel writer and photographer focusing on Japan's historical sites and natural wonders.",
    lastUpdated: null,
  },
];

// Mock experts data (from src/data/mockExperts.ts)
const MOCK_EXPERTS = {
  "mika-tanaka": {
    id: "mika-tanaka",
    name: "Mika Tanaka",
    bio: "Tea ceremony host and licensed Kyoto guide with over 15 years of experience sharing the beauty of Japan's ancient capital. Specializing in temple visits, traditional crafts, and authentic cultural experiences, Mika brings deep knowledge of Kyoto's history, architecture, and spiritual traditions. Her passion for preserving and sharing Japanese heritage has made her one of Kyoto's most sought-after cultural guides.",
    expertise: [
      "Temple Architecture & History",
      "Tea Ceremony",
      "Traditional Crafts",
      "Zen Gardens",
      "Kyoto Heritage Sites",
    ],
    languages: ["English", "Japanese"],
    avatar: "https://images.pexels.com/photos/2343468/pexels-photo-2343468.jpeg",
    coverImage: "https://images.pexels.com/photos/2342479/pexels-photo-2342479.jpeg",
    location: "Kyoto, Japan",
    yearsExperience: 15,
  },
  "kenji-sato": {
    id: "kenji-sato",
    name: "Kenji Sato",
    bio: "Former bartender turned Tokyo nightlife expert with 12 years of experience navigating the city's vibrant after-dark scene. Kenji specializes in curating unforgettable bar crawls, izakaya tours, and rooftop experiences across Shibuya, Shinjuku, and beyond. His insider knowledge of Tokyo's hidden drinking spots and his passion for Japanese bar culture make him the perfect guide for those looking to experience Tokyo's legendary nightlife.",
    expertise: [
      "Tokyo Nightlife",
      "Izakaya Culture",
      "Cocktail Bars",
      "Golden Gai & Memory Lane",
      "Rooftop Bars",
    ],
    languages: ["English", "Japanese"],
    avatar: "https://images.pexels.com/photos/1591055/pexels-photo-1591055.jpeg?auto=compress&cs=tinysrgb&w=1280",
    coverImage: "https://images.pexels.com/photos/1591055/pexels-photo-1591055.jpeg?auto=compress&cs=tinysrgb&w=1280",
    location: "Tokyo, Japan",
    yearsExperience: 12,
  },
  "aya-nakamura": {
    id: "aya-nakamura",
    name: "Aya Nakamura",
    bio: "Food writer and culinary guide with 10 years of experience exploring Hokkaido's rich food culture. Aya's expertise spans from Sapporo's famous ramen alleys to fresh seafood markets and unique regional specialties like soup curry. Fluent in English, Japanese, and Mandarin, she brings an international perspective to Hokkaido's culinary traditions while sharing the stories behind each dish and the people who create them.",
    expertise: [
      "Hokkaido Cuisine",
      "Ramen Culture",
      "Seafood Markets",
      "Soup Curry",
      "Regional Specialties",
    ],
    languages: ["English", "Japanese", "Mandarin"],
    avatar: "https://images.pexels.com/photos/725997/pexels-photo-725997.jpeg?auto=compress&cs=tinysrgb&w=1280",
    coverImage: "https://images.pexels.com/photos/725997/pexels-photo-725997.jpeg?auto=compress&cs=tinysrgb&w=1280",
    location: "Sapporo, Hokkaido, Japan",
    yearsExperience: 10,
  },
};

/**
 * Generate slug from name
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

/**
 * Upload image from URL to Sanity
 */
async function uploadImage(client, imageUrl, filename) {
  try {
    console.log(`  → Fetching image: ${imageUrl}`);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`  → Uploading image to Sanity...`);
    const asset = await client.assets.upload("image", buffer, {
      filename: filename,
    });

    return asset._id;
  } catch (error) {
    console.error(`  ✗ Failed to upload image: ${error.message}`);
    throw error;
  }
}

/**
 * Get or create image asset reference
 */
async function getOrUploadImage(client, imageUrl, filename, existingAssetRef) {
  if (existingAssetRef) {
    return existingAssetRef;
  }

  if (!imageUrl) {
    return null;
  }

  return await uploadImage(client, imageUrl, filename);
}

/**
 * Create or update author in Sanity
 */
async function ensureAuthor(client, authorData) {
  const slug = authorData.id || generateSlug(authorData.name);
  
  console.log(`\n📝 Processing author: ${authorData.name} (${slug})`);

  // Check if author already exists
  const existing = await client.fetch(
    `*[_type == "author" && slug.current == $slug][0]`,
    { slug }
  );

  let avatarAssetRef = existing?.avatar?.asset?._ref;
  let coverImageAssetRef = existing?.coverImage?.asset?._ref;

  // Upload avatar if needed
  if (authorData.avatar && !avatarAssetRef) {
    try {
      avatarAssetRef = await uploadImage(
        client,
        authorData.avatar,
        `author-${slug}-avatar.jpg`
      );
    } catch (error) {
      console.error(`  ⚠ Failed to upload avatar, continuing without it`);
    }
  }

  // Upload cover image if needed
  if (authorData.coverImage && !coverImageAssetRef) {
    try {
      coverImageAssetRef = await uploadImage(
        client,
        authorData.coverImage,
        `author-${slug}-cover.jpg`
      );
    } catch (error) {
      console.error(`  ⚠ Failed to upload cover image, continuing without it`);
    }
  }

  const authorDoc = {
    _type: "author",
    _id: `author-${slug}`,
    name: authorData.name,
    slug: {
      _type: "slug",
      current: slug,
    },
    bio: authorData.bio,
    expertise: authorData.expertise || [],
    languages: authorData.languages || [],
    ...(avatarAssetRef && {
      avatar: {
        _type: "image",
        asset: {
          _type: "reference",
          _ref: avatarAssetRef,
        },
      },
    }),
    ...(coverImageAssetRef && {
      coverImage: {
        _type: "image",
        asset: {
          _type: "reference",
          _ref: coverImageAssetRef,
        },
      },
    }),
    ...(authorData.location && { location: authorData.location }),
    ...(authorData.yearsExperience !== undefined && {
      yearsExperience: authorData.yearsExperience,
    }),
  };

  await client.createOrReplace(authorDoc);
  console.log(`  ✓ Author created/updated: ${authorData.name}`);

  return `author-${slug}`;
}

/**
 * Create or update guide in Sanity
 */
async function ensureGuide(client, guideData, authorId) {
  const slug = guideData.slug;
  
  console.log(`\n📖 Processing guide: ${guideData.title} (${slug})`);

  // Check if guide already exists
  const existing = await client.fetch(
    `*[_type == "guide" && slug.current == $slug][0]`,
    { slug }
  );

  let coverImageAssetRef = existing?.coverImage?.asset?._ref;

  // Upload cover image if needed
  if (guideData.image && !coverImageAssetRef) {
    try {
      coverImageAssetRef = await uploadImage(
        client,
        guideData.image,
        `guide-${slug}-cover.jpg`
      );
    } catch (error) {
      console.error(`  ⚠ Failed to upload cover image, continuing without it`);
    }
  }

  const guideDoc = {
    _type: "guide",
    _id: `guide-${slug}`,
    title: guideData.title,
    headline: guideData.title, // Use title as headline
    summary: guideData.summary,
    categories: guideData.categories || [],
    location: guideData.location,
    featured: guideData.featured || false,
    slug: {
      _type: "slug",
      current: slug,
    },
    author: {
      _type: "reference",
      _ref: authorId,
    },
    ...(coverImageAssetRef && {
      coverImage: {
        _type: "image",
        asset: {
          _type: "reference",
          _ref: coverImageAssetRef,
        },
      },
    }),
    ...(guideData.lastUpdated && {
      publishedAt: guideData.lastUpdated,
    }),
  };

  await client.createOrReplace(guideDoc);
  console.log(`  ✓ Guide created/updated: ${guideData.title}`);

  return `guide-${slug}`;
}

/**
 * Extract all guides from MOCK_EXPERTS
 */
function extractGuidesFromMockExperts() {
  const allGuides = [];
  for (const expert of Object.values(MOCK_EXPERTS)) {
    if (expert.guides && Array.isArray(expert.guides)) {
      allGuides.push(...expert.guides);
    }
  }
  return allGuides;
}

/**
 * Extract unique authors from guides
 */
function extractAuthorsFromGuides(guides) {
  const authorMap = new Map();

  for (const guide of guides) {
    const authorName = guide.name;
    if (!authorMap.has(authorName)) {
      // Try to find author in MOCK_EXPERTS
      const authorId = generateSlug(authorName);
      const expertData = MOCK_EXPERTS[authorId];

      if (expertData) {
        authorMap.set(authorName, expertData);
      } else {
        // Create minimal author data from guide
        authorMap.set(authorName, {
          id: authorId,
          name: authorName,
          bio: guide.experience || `Expert guide specializing in ${guide.categories.join(", ")}.`,
          expertise: guide.categories.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)),
          languages: guide.languages || [],
          location: guide.location ? `${guide.location.charAt(0).toUpperCase() + guide.location.slice(1)}, Japan` : undefined,
        });
      }
    }
  }

  return Array.from(authorMap.values());
}

async function run() {
  console.log("🚀 Starting migration of guides and authors to Sanity...\n");

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

  // Step 1: Collect all guides from both sources
  console.log("📋 Step 1: Collecting guides and authors...");
  const guidesFromMockExperts = extractGuidesFromMockExperts();
  
  // Merge guides, deduplicating by slug
  const guideMap = new Map();
  for (const guide of FALLBACK_GUIDES) {
    guideMap.set(guide.slug, guide);
  }
  for (const guide of guidesFromMockExperts) {
    if (!guideMap.has(guide.slug)) {
      guideMap.set(guide.slug, guide);
    }
  }
  
  const allGuides = Array.from(guideMap.values());
  console.log(`Found ${allGuides.length} unique guide(s)`);
  
  // Extract unique authors
  const authorsFromGuides = extractAuthorsFromGuides(allGuides);
  const authorsFromMock = Object.values(MOCK_EXPERTS);
  
  // Merge authors, preferring mock experts data
  const authorMap = new Map();
  for (const author of authorsFromMock) {
    authorMap.set(author.name, author);
  }
  for (const author of authorsFromGuides) {
    if (!authorMap.has(author.name)) {
      authorMap.set(author.name, author);
    }
  }
  
  const allAuthors = Array.from(authorMap.values());
  console.log(`Found ${allAuthors.length} unique author(s)\n`);

  // Step 2: Create authors in Sanity
  console.log("👥 Step 2: Creating authors in Sanity...");
  const authorIdMap = new Map();
  
  for (const author of allAuthors) {
    try {
      const authorId = await ensureAuthor(client, author);
      authorIdMap.set(author.name, authorId);
    } catch (error) {
      console.error(`  ✗ Failed to create author ${author.name}: ${error.message}`);
    }
  }

  // Step 3: Create guides in Sanity
  console.log("\n📚 Step 3: Creating guides in Sanity...");
  let successCount = 0;
  let errorCount = 0;

  for (const guide of allGuides) {
    try {
      const authorName = guide.name;
      const authorId = authorIdMap.get(authorName);

      if (!authorId) {
        console.error(`  ✗ No author ID found for ${authorName}, skipping guide ${guide.slug}`);
        errorCount++;
        continue;
      }

      await ensureGuide(client, guide, authorId);
      successCount++;
    } catch (error) {
      console.error(`  ✗ Failed to create guide ${guide.slug}: ${error.message}`);
      errorCount++;
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("✅ Migration complete!");
  console.log("=".repeat(60));
  console.log(`Authors created/updated: ${allAuthors.length}`);
  console.log(`Guides created/updated: ${successCount}`);
  if (errorCount > 0) {
    console.log(`Errors: ${errorCount}`);
  }
  console.log("\n💡 Next steps:");
  console.log("   1. Verify the content in Sanity Studio");
  console.log("   2. Remove FALLBACK_GUIDES from src/lib/sanity/guides.ts");
  console.log("   3. Remove MOCK_EXPERTS from src/data/mockExperts.ts (if no longer needed)");
}

run().catch((error) => {
  console.error("\n❌ Migration failed:", error);
  process.exit(1);
});

