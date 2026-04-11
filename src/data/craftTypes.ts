/**
 * Traditional craft type taxonomy for the craft vertical.
 * Used for filtering and categorizing craft workshop locations.
 */

export type CraftTypeId =
  | "pottery"
  | "textile"
  | "woodwork"
  | "papermaking"
  | "lacquerware"
  | "metalwork"
  | "dyeing"
  | "glasswork"
  | "calligraphy"
  | "kintsugi"
  | "mixed";

export type CraftTypeDefinition = {
  id: CraftTypeId;
  label: string;
  labelJapanese: string;
  description: string;
  color: string;
  thumbnail: string;
  patterns: RegExp[];
};

export const CRAFT_TYPES: readonly CraftTypeDefinition[] = [
  {
    id: "pottery",
    label: "Pottery & Ceramics",
    labelJapanese: "陶芸",
    description: "Wheel-throwing, hand-building, and glazing techniques passed down through generations",
    color: "#C4704F",
    thumbnail: "",
    patterns: [
      /potter/i, /ceramic/i, /porcelain/i, /stoneware/i, /earthenware/i,
      /raku/i, /tokoname/i, /arita/i, /bizen/i, /mashiko/i, /mino/i,
      /seto/i, /kutani/i, /hagi/i, /karatsu/i, /shigaraki/i, /banko/i,
      /tobe/i, /hasami/i, /yakimono/i, /togei/i, /陶芸/,
    ],
  },
  {
    id: "textile",
    label: "Textile & Weaving",
    labelJapanese: "織物",
    description: "Silk weaving, kimono making, and traditional fabric arts",
    color: "#4A6FA5",
    thumbnail: "",
    patterns: [
      /textile/i, /weav/i, /fabric/i, /kimono/i, /silk/i, /loom/i,
      /nishijin/i, /kasuri/i, /orimono/i, /kumihimo/i, /felt/i,
      /embroider/i, /stitching/i, /sewing/i, /furoshiki/i, /織物/,
    ],
  },
  {
    id: "woodwork",
    label: "Woodwork & Carving",
    labelJapanese: "木工",
    description: "Joinery, carving, and bamboo craft traditions",
    color: "#8B6F47",
    thumbnail: "",
    patterns: [
      /woodwork/i, /wood\s*carv/i, /carpent/i, /joiner/i, /bamboo/i,
      /lumber/i, /timber/i, /wooden/i, /wood\s*craft/i, /marquetry/i,
      /kumiko/i, /kokeshi/i, /yosegi/i, /木工/,
    ],
  },
  {
    id: "papermaking",
    label: "Washi & Paper",
    labelJapanese: "和紙",
    description: "Handmade washi paper, paper folding, and book binding",
    color: "#C9A84C",
    thumbnail: "",
    patterns: [
      /washi/i, /paper\s*mak/i, /paper\s*craft/i, /origami/i,
      /book\s*bind/i, /calligraph.*paper/i, /和紙/,
    ],
  },
  {
    id: "lacquerware",
    label: "Lacquerware",
    labelJapanese: "漆器",
    description: "Urushi lacquer coating and decorative techniques",
    color: "#A0413C",
    thumbnail: "",
    patterns: [
      /lacquer/i, /urushi/i, /maki-?e/i, /wajima/i, /tsugaru/i,
      /漆/i, /漆器/,
    ],
  },
  {
    id: "metalwork",
    label: "Metalwork & Blades",
    labelJapanese: "金工",
    description: "Sword forging, knife making, and decorative metalwork",
    color: "#6B7B8D",
    thumbnail: "",
    patterns: [
      /metal/i, /forge/i, /forging/i, /sword/i, /katana/i, /blade/i,
      /knife/i, /blacksmith/i, /copper/i, /iron/i, /bronze/i,
      /goldsmith/i, /silversmith/i, /tsubame/i, /seki/i, /金工/,
    ],
  },
  {
    id: "dyeing",
    label: "Dyeing & Indigo",
    labelJapanese: "染色",
    description: "Natural indigo dyeing, shibori tie-dye, and color traditions",
    color: "#3B4F8A",
    thumbnail: "",
    patterns: [
      /dye/i, /dyeing/i, /indigo/i, /shibori/i, /aizome/i,
      /bingata/i, /yuzen/i, /katazome/i, /染/i, /藍染/,
    ],
  },
  {
    id: "glasswork",
    label: "Glasswork",
    labelJapanese: "ガラス工芸",
    description: "Blown glass, Edo kiriko cut glass, and decorative glass arts",
    color: "#3D9B8F",
    thumbnail: "",
    patterns: [
      /glass/i, /kiriko/i, /blown/i, /glasswork/i, /stained/i,
      /ガラス/,
    ],
  },
  {
    id: "calligraphy",
    label: "Calligraphy",
    labelJapanese: "書道",
    description: "Brush writing and ink art traditions",
    color: "#3A3A3A",
    thumbnail: "",
    patterns: [
      /calligraph/i, /shodo/i, /書道/,
    ],
  },
  {
    id: "kintsugi",
    label: "Kintsugi",
    labelJapanese: "金継ぎ",
    description: "The art of repairing broken pottery with gold",
    color: "#C9963C",
    thumbnail: "",
    patterns: [
      /kintsugi/i, /kintsukuroi/i, /金継/i,
    ],
  },
  {
    id: "mixed",
    label: "Mixed / Other",
    labelJapanese: "その他",
    description: "Multi-craft workshops and other traditional arts",
    color: "#7B6B8D",
    thumbnail: "",
    patterns: [],
  },
] as const;

/**
 * Get a craft type definition by its ID.
 */
export function getCraftTypeById(id: CraftTypeId): CraftTypeDefinition | undefined {
  return CRAFT_TYPES.find((ct) => ct.id === id);
}

/**
 * Auto-detect craft type from location name and description.
 * Returns the first matching type, or "mixed" if no patterns match.
 */
export function detectCraftType(name: string, description?: string | null): CraftTypeId {
  const text = `${name} ${description || ""}`;

  for (const craftType of CRAFT_TYPES) {
    if (craftType.id === "mixed") continue;
    for (const pattern of craftType.patterns) {
      if (pattern.test(text)) {
        return craftType.id;
      }
    }
  }

  return "mixed";
}

/**
 * Get the color hex for a craft type. Falls back to the generic craft indigo.
 */
export function getCraftTypeColor(craftType: string): string {
  const ct = CRAFT_TYPES.find((c) => c.id === craftType);
  return ct?.color ?? "#5b5fc7";
}

/**
 * Check if a string is a valid craft type ID.
 */
export function isValidCraftTypeId(id: string): id is CraftTypeId {
  return CRAFT_TYPES.some((ct) => ct.id === id);
}
