import type { CityId, RegionId, TripStyle, InterestId } from "@/types/trip";

export type TripTemplate = {
  id: string;
  name: string;
  description: string;
  duration: number;
  cities: CityId[];
  regions: RegionId[];
  interests: InterestId[];
  style: TripStyle;
  tags: string[];
  highlights: string[];
};

export const TRIP_TEMPLATES: TripTemplate[] = [
  {
    id: "classic-tokyo",
    name: "Classic Tokyo",
    description: "Experience the best of Tokyo - from ancient temples to neon-lit streets. Perfect for first-time visitors.",
    duration: 3,
    cities: ["tokyo"],
    regions: ["kanto"],
    interests: ["culture", "food", "shopping"],
    style: "balanced",
    tags: ["first-time", "city", "modern"],
    highlights: ["Senso-ji Temple", "Shibuya Crossing", "Tsukiji Market", "Tokyo Skytree"],
  },
  {
    id: "kyoto-cultural",
    name: "Kyoto Cultural",
    description: "Immerse yourself in traditional Japan - temples, shrines, geisha districts, and zen gardens.",
    duration: 4,
    cities: ["kyoto"],
    regions: ["kansai"],
    interests: ["culture", "history", "photography"],
    style: "relaxed",
    tags: ["traditional", "temples", "culture"],
    highlights: ["Fushimi Inari", "Kinkaku-ji", "Arashiyama Bamboo", "Gion District"],
  },
  {
    id: "golden-route",
    name: "Golden Route",
    description: "The classic Japan journey - Tokyo to Kyoto to Osaka. Cover all the must-see destinations.",
    duration: 7,
    cities: ["tokyo", "kyoto", "osaka"],
    regions: ["kanto", "kansai"],
    interests: ["culture", "food", "history", "shopping"],
    style: "balanced",
    tags: ["classic", "first-time", "comprehensive"],
    highlights: ["Tokyo highlights", "Shinkansen experience", "Kyoto temples", "Osaka food scene"],
  },
  {
    id: "osaka-foodie",
    name: "Osaka Food Lover",
    description: "Japan's kitchen awaits - explore street food, local markets, and culinary traditions.",
    duration: 3,
    cities: ["osaka"],
    regions: ["kansai"],
    interests: ["food", "culture", "nightlife"],
    style: "balanced",
    tags: ["food", "street-food", "nightlife"],
    highlights: ["Dotonbori", "Kuromon Market", "Shinsekai", "Takoyaki & Okonomiyaki"],
  },
  {
    id: "kansai-explorer",
    name: "Kansai Explorer",
    description: "Discover the Kansai region - Kyoto's temples, Osaka's energy, and Nara's deer.",
    duration: 5,
    cities: ["kyoto", "osaka", "nara"],
    regions: ["kansai"],
    interests: ["culture", "history", "nature", "food"],
    style: "balanced",
    tags: ["regional", "temples", "nature"],
    highlights: ["Kyoto temples", "Nara deer park", "Osaka Castle", "Day trips"],
  },
  {
    id: "tokyo-yokohama",
    name: "Tokyo & Yokohama",
    description: "Modern Japan at its finest - explore two vibrant cities with distinct personalities.",
    duration: 4,
    cities: ["tokyo", "yokohama"],
    regions: ["kanto"],
    interests: ["culture", "shopping", "food", "photography"],
    style: "fast",
    tags: ["urban", "modern", "port-city"],
    highlights: ["Tokyo districts", "Yokohama Chinatown", "Minato Mirai", "Ramen Museum"],
  },
];

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): TripTemplate | undefined {
  return TRIP_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get templates filtered by tag
 */
export function getTemplatesByTag(tag: string): TripTemplate[] {
  return TRIP_TEMPLATES.filter((t) => t.tags.includes(tag));
}
