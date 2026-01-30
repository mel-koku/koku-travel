import type { KnownRegionId } from "@/types/trip";
import type { VibeId } from "./vibes";

/**
 * Region metadata for the trip builder region selection step.
 */
export type RegionDescription = {
  id: KnownRegionId;
  name: string;
  heroImage: string;
  tagline: string;
  description: string;
  highlights: string[];
  bestFor: VibeId[];
  coordinates: {
    lat: number;
    lng: number;
  };
};

/**
 * Detailed descriptions and metadata for all 9 Japanese regions.
 * Used in the region selection step of the trip builder wizard.
 */
export const REGION_DESCRIPTIONS: readonly RegionDescription[] = [
  {
    id: "kansai",
    name: "Kansai",
    heroImage: "/images/regions/kansai-hero.jpg",
    tagline: "Japan's Cultural Heartland",
    description:
      "Home to ancient capitals Kyoto and Nara, Kansai offers unparalleled access to traditional temples, shrines, and Japan's rich cultural heritage. Osaka adds vibrant food scenes and nightlife.",
    highlights: ["Fushimi Inari Shrine", "Osaka Castle", "Nara Deer Park", "Dotonbori"],
    bestFor: ["cultural_heritage", "foodie_paradise"],
    coordinates: { lat: 34.6937, lng: 135.5023 },
  },
  {
    id: "kanto",
    name: "Kanto",
    heroImage: "/images/regions/kanto-hero.jpg",
    tagline: "Where Tradition Meets Tomorrow",
    description:
      "Tokyo and its surrounding areas blend cutting-edge technology with traditional neighborhoods. From Shibuya's neon lights to Kamakura's ancient temples, Kanto has it all.",
    highlights: ["Shibuya Crossing", "Senso-ji Temple", "teamLab Borderless", "Kamakura"],
    bestFor: ["neon_nightlife", "cultural_heritage", "hidden_gems"],
    coordinates: { lat: 35.6762, lng: 139.6503 },
  },
  {
    id: "chubu",
    name: "Chubu",
    heroImage: "/images/regions/chubu-hero.jpg",
    tagline: "Alpine Majesty & Samurai Spirit",
    description:
      "Central Japan features the Japanese Alps, traditional villages like Shirakawa-go, and the samurai heritage of Kanazawa. Perfect for nature lovers and history enthusiasts.",
    highlights: ["Japanese Alps", "Shirakawa-go", "Kenroku-en Garden", "Mt. Fuji views"],
    bestFor: ["nature_adventure", "cultural_heritage"],
    coordinates: { lat: 36.2048, lng: 137.2529 },
  },
  {
    id: "kyushu",
    name: "Kyushu",
    heroImage: "/images/regions/kyushu-hero.jpg",
    tagline: "Hot Springs & Southern Charm",
    description:
      "Japan's southwestern island is famous for its hot springs (onsen), volcanic landscapes, and unique regional cuisine. Fukuoka's yatai food stalls are legendary.",
    highlights: ["Beppu Onsen", "Fukuoka Yatai", "Kumamoto Castle", "Nagasaki Peace Park"],
    bestFor: ["nature_adventure", "foodie_paradise"],
    coordinates: { lat: 33.5902, lng: 130.4017 },
  },
  {
    id: "hokkaido",
    name: "Hokkaido",
    heroImage: "/images/regions/hokkaido-hero.jpg",
    tagline: "Wilderness & Fresh Flavors",
    description:
      "Japan's northern frontier offers pristine nature, world-class skiing, and the freshest seafood. Sapporo's ramen and Hokkaido's dairy products are must-tries.",
    highlights: ["Niseko Ski Resort", "Sapporo Snow Festival", "Furano Lavender Fields", "Fresh Seafood"],
    bestFor: ["nature_adventure", "foodie_paradise"],
    coordinates: { lat: 43.0618, lng: 141.3545 },
  },
  {
    id: "tohoku",
    name: "Tohoku",
    heroImage: "/images/regions/tohoku-hero.jpg",
    tagline: "Untouched Beauty & Festivals",
    description:
      "Northern Honshu remains off the typical tourist path, offering stunning natural scenery, famous summer festivals, and authentic rural Japan experiences.",
    highlights: ["Matsushima Bay", "Nebuta Festival", "Ginzan Onsen", "Zao Snow Monsters"],
    bestFor: ["hidden_gems", "nature_adventure"],
    coordinates: { lat: 38.2682, lng: 140.8694 },
  },
  {
    id: "chugoku",
    name: "Chugoku",
    heroImage: "/images/regions/chugoku-hero.jpg",
    tagline: "Peace, Art & Island Hopping",
    description:
      "Western Honshu is home to Hiroshima's Peace Memorial, the floating torii of Miyajima, and the art islands of the Seto Inland Sea.",
    highlights: ["Hiroshima Peace Memorial", "Miyajima Torii Gate", "Naoshima Art Island", "Onomichi"],
    bestFor: ["cultural_heritage", "hidden_gems"],
    coordinates: { lat: 34.3963, lng: 132.4594 },
  },
  {
    id: "shikoku",
    name: "Shikoku",
    heroImage: "/images/regions/shikoku-hero.jpg",
    tagline: "Pilgrimage & Natural Wonders",
    description:
      "The smallest main island offers the famous 88-temple pilgrimage route, dramatic river valleys, and some of Japan's most authentic experiences away from crowds.",
    highlights: ["88 Temple Pilgrimage", "Iya Valley", "Dogo Onsen", "Ritsurin Garden"],
    bestFor: ["hidden_gems", "nature_adventure", "cultural_heritage"],
    coordinates: { lat: 33.8416, lng: 133.5457 },
  },
  {
    id: "okinawa",
    name: "Okinawa",
    heroImage: "/images/regions/okinawa-hero.jpg",
    tagline: "Tropical Paradise & Unique Culture",
    description:
      "Japan's tropical islands offer beautiful beaches, unique Ryukyu culture distinct from mainland Japan, and a laid-back island atmosphere.",
    highlights: ["Shuri Castle", "Kerama Islands", "Okinawa Churaumi Aquarium", "Kokusai Street"],
    bestFor: ["nature_adventure", "hidden_gems"],
    coordinates: { lat: 26.2124, lng: 127.6809 },
  },
] as const;

/**
 * Get a region description by its ID.
 */
export function getRegionDescription(regionId: KnownRegionId): RegionDescription | undefined {
  return REGION_DESCRIPTIONS.find((r) => r.id === regionId);
}

/**
 * Get all region IDs.
 */
export function getAllRegionIds(): KnownRegionId[] {
  return REGION_DESCRIPTIONS.map((r) => r.id);
}
