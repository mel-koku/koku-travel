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
    tagline: "Where temples whisper and street food shouts",
    description:
      "Kyoto is the quiet one. Moss gardens, stone paths, the soft swish of a kimono around a corner. Nara lets deer walk right up to you like it's no big deal. And then there's Osaka — loud, greasy, wonderful — where you'll find yourself eating takoyaki at midnight wondering how one region holds all of this. It does. Effortlessly.",
    highlights: ["Fushimi Inari Shrine", "Osaka Castle", "Nara Deer Park", "Dotonbori"],
    bestFor: ["cultural_heritage", "foodie_paradise"],
    coordinates: { lat: 34.6937, lng: 135.5023 },
  },
  {
    id: "kanto",
    name: "Kanto",
    heroImage: "/images/regions/kanto-hero.jpg",
    tagline: "A hundred cities in one",
    description:
      "Tokyo is a lot. In the best way. One minute you're in a six-seat ramen shop where the chef hasn't changed the recipe in forty years. The next, you're standing in a digital art universe that didn't exist last month. Kamakura is an hour away and feels like another century. That's the thing about Kanto — it doesn't pick a lane. You shouldn't either.",
    highlights: ["Shibuya Crossing", "Senso-ji Temple", "teamLab Borderless", "Kamakura"],
    bestFor: ["neon_nightlife", "cultural_heritage", "hidden_gems"],
    coordinates: { lat: 35.6762, lng: 139.6503 },
  },
  {
    id: "chubu",
    name: "Chubu",
    heroImage: "/images/regions/chubu-hero.jpg",
    tagline: "The scenic route, on purpose",
    description:
      "This is where Japan slows down and looks up. Thatched-roof villages in Shirakawa-go that haven't changed in centuries. Alpine trails where the only sound is your own breathing. Kanazawa, with its samurai districts and a garden so perfect it almost feels staged (it's not). Chubu is what happens when you skip the bullet train and take the scenic route instead.",
    highlights: ["Japanese Alps", "Shirakawa-go", "Kenroku-en Garden", "Mt. Fuji views"],
    bestFor: ["nature_adventure", "cultural_heritage"],
    coordinates: { lat: 36.2048, lng: 137.2529 },
  },
  {
    id: "kyushu",
    name: "Kyushu",
    heroImage: "/images/regions/kyushu-hero.jpg",
    tagline: "Steam, soul, and slow mornings",
    description:
      "Kyushu runs on hot springs and good food. Sink into a steaming onsen in Beppu while volcanic steam drifts across the hillside. Eat your way through Fukuoka's yatai stalls at 11pm like a local. Visit Nagasaki and feel something shift inside you. The south of Japan has a warmth to it — the weather, the people, the bowls of tonkotsu ramen. All of it.",
    highlights: ["Beppu Onsen", "Fukuoka Yatai", "Kumamoto Castle", "Nagasaki Peace Park"],
    bestFor: ["nature_adventure", "foodie_paradise"],
    coordinates: { lat: 33.5902, lng: 130.4017 },
  },
  {
    id: "hokkaido",
    name: "Hokkaido",
    heroImage: "/images/regions/hokkaido-hero.jpg",
    tagline: "Big skies, bigger flavors",
    description:
      "Hokkaido doesn't do subtle. Lavender fields that stretch to the horizon. Powder snow that other ski resorts only dream about. Seafood so fresh it's almost unfair. Sapporo feels like a different country — wide streets, craft beer, miso ramen that ruins every bowl you'll eat after it. Come for a weekend, stay in your head forever.",
    highlights: ["Niseko Ski Resort", "Sapporo Snow Festival", "Furano Lavender Fields", "Fresh Seafood"],
    bestFor: ["nature_adventure", "foodie_paradise"],
    coordinates: { lat: 43.0618, lng: 141.3545 },
  },
  {
    id: "tohoku",
    name: "Tohoku",
    heroImage: "/images/regions/tohoku-hero.jpg",
    tagline: "Japan before the crowds found it",
    description:
      "Most visitors skip Tohoku. That's exactly why you shouldn't. Picture this: a lantern-lit onsen village buried in snow. Summer festivals so electric they give you chills. Matsushima Bay at golden hour, where pine-covered islands scatter across the water like someone placed them there on purpose. This is Japan before the guidebooks got to it.",
    highlights: ["Matsushima Bay", "Nebuta Festival", "Ginzan Onsen", "Zao Snow Monsters"],
    bestFor: ["hidden_gems", "nature_adventure"],
    coordinates: { lat: 38.2682, lng: 140.8694 },
  },
  {
    id: "chugoku",
    name: "Chugoku",
    heroImage: "/images/regions/chugoku-hero.jpg",
    tagline: "Heavy history, light on your feet",
    description:
      "Hiroshima will change you. Quietly, permanently. Then Miyajima's floating torii appears at high tide and something lifts again. Hop a ferry to Naoshima, where contemporary art lives inside century-old homes on a tiny island. Cycle through Onomichi's hillside temples. Chugoku moves between heavy and light, past and present — and somehow finds the balance every time.",
    highlights: ["Hiroshima Peace Memorial", "Miyajima Torii Gate", "Naoshima Art Island", "Onomichi"],
    bestFor: ["cultural_heritage", "hidden_gems"],
    coordinates: { lat: 34.3963, lng: 132.4594 },
  },
  {
    id: "shikoku",
    name: "Shikoku",
    heroImage: "/images/regions/shikoku-hero.jpg",
    tagline: "Small island, big quiet",
    description:
      "Shikoku is small. That's the whole point. Walk the 88-temple pilgrimage — or even just a piece of it — and feel the noise of modern life fade out. Cross vine bridges over river valleys so green they don't look real. Soak in Dogo Onsen, one of the oldest hot springs in Japan. No crowds, no rush. Just you and an island that's been quietly perfect this entire time.",
    highlights: ["88 Temple Pilgrimage", "Iya Valley", "Dogo Onsen", "Ritsurin Garden"],
    bestFor: ["hidden_gems", "nature_adventure", "cultural_heritage"],
    coordinates: { lat: 33.8416, lng: 133.5457 },
  },
  {
    id: "okinawa",
    name: "Okinawa",
    heroImage: "/images/regions/okinawa-hero.jpg",
    tagline: "Japan, unplugged",
    description:
      "Forget everything you think you know about Japan. Okinawa rewrites the rules. Turquoise water, coral reefs, a culture that's Ryukyuan before it's Japanese. The pace here is slower on purpose. Shuri Castle tells a story the mainland doesn't. The Kerama Islands have beaches that belong on a screensaver but somehow feel untouched. It's Japan — just the version that learned how to exhale.",
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
