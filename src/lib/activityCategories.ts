const SUPABASE_PHOTOS =
  "https://mbjcxrfuuczlauavashs.supabase.co/storage/v1/object/public/location-photos";

export type ActivityCategory = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  image: string;
  /** specialty strings that map to this category */
  specialties: string[];
};

/** Representative photo for the "All experts" tile */
export const ALL_EXPERTS_IMAGE = `${SUPABASE_PHOTOS}/arashiyama-kansai-7ef73f02/primary.jpg`;

export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  {
    id: "outdoor",
    label: "Outdoor & Adventure",
    emoji: "mountain",
    description: "Kayaking, cycling, hiking, diving, snow sports",
    image: `${SUPABASE_PHOTOS}/iriomote-okinawa-ef0ecfd5/primary.png`,
    specialties: [
      "Outdoor adventure",
      "Kayaking",
      "Cycling guide",
      "Snow activities",
      "Mountain guiding",
      "River guiding",
      "Diving",
      "Surfing",
      "Fishing",
      "Snorkeling",
      "Maritime guiding",
    ],
  },
  {
    id: "cultural-tours",
    label: "Cultural Tours",
    emoji: "landmark",
    description: "Guided walks, local neighbourhoods, market visits",
    image: `${SUPABASE_PHOTOS}/the-owari-chubu-f41442d3/primary.jpg`,
    specialties: [
      "Cultural tours",
      "Cultural immersion",
      "Local knowledge",
      "Market guiding",
      "Food culture",
      "Shrine traditions",
      "Temple traditions",
    ],
  },
  {
    id: "food-cooking",
    label: "Food & Cooking",
    emoji: "utensils",
    description: "Cooking classes, sake, soba, sushi, farm visits",
    image: `${SUPABASE_PHOTOS}/nijo-market-hokkaido-163f6eaf/primary.jpg`,
    specialties: [
      "Japanese cuisine",
      "Soba making",
      "Sushi making",
      "Udon making",
      "Sake brewing",
      "Wine tasting",
      "Farm experience",
    ],
  },
  {
    id: "pottery",
    label: "Pottery & Ceramics",
    emoji: "pottery",
    description: "Wheel throwing, glazing, kintsugi repair",
    image: `${SUPABASE_PHOTOS}/locations/mashiko-pottery-studio-tsukamoto-kanto-c3d74c12/primary.jpg`,
    specialties: [
      "Pottery",
      "Mashiko-yaki",
      "Wood-fired kiln",
      "Glazing",
      "Kintsugi",
      "Ceramic repair",
    ],
  },
  {
    id: "textiles",
    label: "Dyeing & Textiles",
    emoji: "scissors",
    description: "Indigo dyeing, shibori, weaving, natural dyes",
    image: `${SUPABASE_PHOTOS}/arimatsu-shibori-district-chubu-92b4bd51/primary.jpeg`,
    specialties: [
      "Dyeing",
      "Weaving",
      "Awa indigo",
      "Shibori",
      "Natural dyeing",
      "Backstrap loom",
      "Textile arts",
      "Fair-trade textiles",
    ],
  },
  {
    id: "ink-arts",
    label: "Calligraphy & Ink",
    emoji: "feather",
    description: "Shodo, sumi-e painting, seal carving",
    image: `${SUPABASE_PHOTOS}/locations/hozenji-temple-kansai-58d20329/primary.jpg`,
    specialties: ["Shodo", "Sumi ink painting", "Seal carving", "Calligraphy"],
  },
  {
    id: "wood-paper",
    label: "Wood & Paper",
    emoji: "tree",
    description: "Kumiko joinery, washi papermaking, woodcraft",
    image: `${SUPABASE_PHOTOS}/locations/echizen-washi-village-chubu-f5427ba3/primary.jpg`,
    specialties: [
      "Woodworking",
      "Kumiko",
      "Wood joinery",
      "Hida craftsmanship",
      "Sashimono",
      "Furniture joinery",
      "Edo woodcraft",
      "Papermaking",
      "Mino washi",
      "Hand-scooped paper",
      "Kozo fiber",
      "Tosa washi",
      "Traditional papermaking",
      "Natural fibers",
    ],
  },
  {
    id: "lacquer-glass",
    label: "Lacquer & Glass",
    emoji: "sparkles",
    description: "Urushi lacquerware, Edo Kiriko glasswork, ironware",
    image: `${SUPABASE_PHOTOS}/wajima-museum-of-urushi-art-chubu-d05eb064/primary.jpg`,
    specialties: [
      "Wajima-nuri",
      "Chinkin",
      "Lacquer painting",
      "Urushi lacquer",
      "Edo Kiriko",
      "Diamond-wheel cutting",
      "Crystal glass",
      "Metalwork",
      "Nambu ironware",
      "Sand casting",
      "Tetsubin kettles",
    ],
  },
  {
    id: "zen-wellness",
    label: "Zen & Wellness",
    emoji: "leaf",
    description: "Meditation, forest bathing, tea ceremony, gardens",
    image: `${SUPABASE_PHOTOS}/locations/nanzen-ji-temple-garden-kansai-48ebc30a/primary.jpg`,
    specialties: [
      "Zen meditation",
      "Forest bathing",
      "Onsen culture",
      "Tea ceremony",
      "Garden design",
      "Bonsai",
      "Kimono dressing",
    ],
  },
  {
    id: "martial-arts",
    label: "Martial Arts",
    emoji: "torii-gate",
    description: "Samurai experience, ninja training, karate",
    image: `${SUPABASE_PHOTOS}/chiran-samurai-district-kyushu-9ed18f12/primary.jpg`,
    specialties: ["Samurai arts", "Ninja training", "Karate"],
  },
];

/** Reverse map: specialty string → category id */
const SPECIALTY_TO_CATEGORY: Map<string, string> = new Map(
  ACTIVITY_CATEGORIES.flatMap((cat) =>
    cat.specialties.map((s) => [s.toLowerCase(), cat.id])
  )
);

/** Generic catch-all specialties — deprioritised when resolving display label */
const GENERIC_CATEGORY_IDS = new Set(["cultural-tours"]);

/**
 * Resolve the best activity category id for a person's specialties.
 * Prefers specific categories over generic ones (e.g., "cultural-tours").
 */
export function resolvePersonCategoryId(
  specialties: string[]
): string | null {
  let fallback: string | null = null;

  for (const s of specialties) {
    const catId = SPECIALTY_TO_CATEGORY.get(s.toLowerCase());
    if (!catId) continue;
    if (!GENERIC_CATEGORY_IDS.has(catId)) return catId;
    if (!fallback) fallback = catId;
  }

  return fallback;
}

/** Return the ActivityCategory object for a given id, or null. */
export function getCategoryById(id: string): ActivityCategory | null {
  return ACTIVITY_CATEGORIES.find((c) => c.id === id) ?? null;
}

/**
 * Given a category id, return the set of specialty strings that belong to it.
 * Used for filtering people by selected activity.
 */
export function getSpecialtiesForCategory(id: string): Set<string> {
  const cat = getCategoryById(id);
  if (!cat) return new Set();
  return new Set(cat.specialties.map((s) => s.toLowerCase()));
}
