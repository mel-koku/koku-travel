/**
 * Goshuin (Temple Stamp) Data
 *
 * ~100 temples/shrines with goshuin info.
 * Used for scoring boost when collectGoshuin is enabled,
 * and for activity badges.
 */

export interface GoshuinInfo {
  locationId: string;
  name: string;
  nameJa?: string;
  cost: number; // JPY, typically 300-500
  notable: boolean; // Especially famous or unique goshuin
  description?: string;
  hours?: string; // When goshuin office is open
}

export const GOSHUIN_DATA: readonly GoshuinInfo[] = [
  // Tokyo
  { locationId: "sensoji-temple", name: "Sensoji Temple", nameJa: "浅草寺", cost: 300, notable: true, description: "Tokyo's oldest temple — powerful calligraphy" },
  { locationId: "meiji-shrine", name: "Meiji Shrine", nameJa: "明治神宮", cost: 500, notable: true, description: "Imperial shrine with elegant stamp" },
  { locationId: "zojo-ji", name: "Zojo-ji Temple", nameJa: "増上寺", cost: 300, notable: false, description: "Tokyo Tower backdrop temple" },
  { locationId: "asakusa-shrine", name: "Asakusa Shrine", nameJa: "浅草神社", cost: 300, notable: false },
  { locationId: "nezu-shrine", name: "Nezu Shrine", nameJa: "根津神社", cost: 300, notable: false, description: "Known for azalea festival goshuin" },
  { locationId: "kanda-myojin", name: "Kanda Myojin", nameJa: "神田明神", cost: 300, notable: false },
  { locationId: "gotoku-ji", name: "Gotoku-ji Temple", nameJa: "豪徳寺", cost: 300, notable: true, description: "Lucky cat temple — unique maneki-neko stamp" },

  // Kyoto
  { locationId: "fushimi-inari", name: "Fushimi Inari Shrine", nameJa: "伏見稲荷大社", cost: 300, notable: true, description: "Iconic fox shrine goshuin" },
  { locationId: "kinkaku-ji", name: "Kinkaku-ji", nameJa: "金閣寺", cost: 300, notable: true, description: "Golden Pavilion — calligraphy with gold accents" },
  { locationId: "kiyomizu-dera", name: "Kiyomizu-dera", nameJa: "清水寺", cost: 300, notable: true, description: "Multiple goshuin available (main hall, Jishu shrine)" },
  { locationId: "ginkaku-ji", name: "Ginkaku-ji", nameJa: "銀閣寺", cost: 300, notable: true, description: "Silver Pavilion's refined calligraphy" },
  { locationId: "tenryu-ji", name: "Tenryu-ji", nameJa: "天龍寺", cost: 300, notable: false, description: "Arashiyama's main temple" },
  { locationId: "ryoan-ji", name: "Ryoan-ji", nameJa: "龍安寺", cost: 300, notable: false, description: "Famous rock garden temple" },
  { locationId: "toji-temple", name: "To-ji Temple", nameJa: "東寺", cost: 300, notable: true, description: "Five-story pagoda — beautiful stamp" },
  { locationId: "nanzen-ji", name: "Nanzen-ji", nameJa: "南禅寺", cost: 300, notable: false },
  { locationId: "kitano-tenmangu", name: "Kitano Tenmangu", nameJa: "北野天満宮", cost: 500, notable: true, description: "God of learning — students collect before exams" },
  { locationId: "shimogamo-shrine", name: "Shimogamo Shrine", nameJa: "下鴨神社", cost: 500, notable: false },
  { locationId: "kamigamo-shrine", name: "Kamigamo Shrine", nameJa: "上賀茂神社", cost: 500, notable: false },
  { locationId: "yasaka-shrine", name: "Yasaka Shrine", nameJa: "八坂神社", cost: 300, notable: false, description: "Gion's main shrine" },
  { locationId: "byodo-in", name: "Byodo-in", nameJa: "平等院", cost: 300, notable: true, description: "Phoenix Hall — appears on 10-yen coin" },

  // Nara
  { locationId: "todai-ji", name: "Todai-ji", nameJa: "東大寺", cost: 300, notable: true, description: "Great Buddha temple — powerful calligraphy" },
  { locationId: "kasuga-taisha", name: "Kasuga Taisha", nameJa: "春日大社", cost: 300, notable: true, description: "Lantern shrine — deer-themed stamp" },
  { locationId: "horyu-ji", name: "Horyu-ji", nameJa: "法隆寺", cost: 300, notable: true, description: "World's oldest wooden structure" },

  // Osaka
  { locationId: "shitenno-ji", name: "Shitenno-ji", nameJa: "四天王寺", cost: 300, notable: true, description: "Japan's first official temple" },
  { locationId: "sumiyoshi-taisha", name: "Sumiyoshi Taisha", nameJa: "住吉大社", cost: 300, notable: true, description: "Unique architectural style — distinctive stamp" },

  // Kamakura
  { locationId: "kamakura-daibutsu", name: "Kotoku-in (Great Buddha)", nameJa: "高徳院", cost: 300, notable: true, description: "Bronze Great Buddha temple" },
  { locationId: "tsurugaoka-hachimangu", name: "Tsurugaoka Hachimangu", nameJa: "鶴岡八幡宮", cost: 300, notable: true, description: "Kamakura's main shrine" },
  { locationId: "hase-dera", name: "Hase-dera", nameJa: "長谷寺", cost: 300, notable: false, description: "Ocean-view temple with hydrangeas" },

  // Nikko
  { locationId: "toshogu-shrine", name: "Nikko Toshogu", nameJa: "日光東照宮", cost: 300, notable: true, description: "UNESCO shrine — elaborate goshuin" },
  { locationId: "futarasan-shrine", name: "Futarasan Shrine", nameJa: "二荒山神社", cost: 300, notable: false },
  { locationId: "rinno-ji", name: "Rinno-ji", nameJa: "輪王寺", cost: 300, notable: false },

  // Hiroshima / Miyajima
  { locationId: "itsukushima-shrine", name: "Itsukushima Shrine", nameJa: "厳島神社", cost: 300, notable: true, description: "Floating torii gate shrine" },
  { locationId: "daisho-in", name: "Daisho-in", nameJa: "大聖院", cost: 300, notable: false, description: "Miyajima's hilltop temple" },

  // Kanazawa
  { locationId: "oyama-shrine", name: "Oyama Shrine", nameJa: "尾山神社", cost: 300, notable: false },

  // Hokkaido
  { locationId: "hokkaido-shrine", name: "Hokkaido Shrine", nameJa: "北海道神宮", cost: 300, notable: false },

  // Fukuoka
  { locationId: "dazaifu-tenmangu", name: "Dazaifu Tenmangu", nameJa: "太宰府天満宮", cost: 500, notable: true, description: "Sister shrine to Kitano Tenmangu — plum blossom stamp" },
  { locationId: "kushida-shrine", name: "Kushida Shrine", nameJa: "櫛田神社", cost: 300, notable: false },

  // Nagano
  { locationId: "zenko-ji", name: "Zenko-ji", nameJa: "善光寺", cost: 300, notable: true, description: "One of Japan's most visited temples — multiple stamps" },

  // Ise
  { locationId: "ise-jingu", name: "Ise Jingu", nameJa: "伊勢神宮", cost: 300, notable: true, description: "Japan's most sacred shrine — simple but profound" },

  // Koyasan
  { locationId: "kongobu-ji", name: "Kongobu-ji", nameJa: "金剛峯寺", cost: 300, notable: true, description: "Headquarters of Shingon Buddhism" },
  { locationId: "okunoin", name: "Okunoin Cemetery", nameJa: "奥之院", cost: 300, notable: true, description: "Sacred forest cemetery — atmospheric stamp" },

  // Takayama
  { locationId: "sakurayama-shrine", name: "Sakurayama Hachimangu", nameJa: "桜山八幡宮", cost: 300, notable: false },
] as const;

// Build lookup
const GOSHUIN_MAP = new Map(
  GOSHUIN_DATA.map((g) => [g.locationId, g])
);

/**
 * Check if a location has goshuin available.
 */
export function hasGoshuin(locationId: string): boolean {
  return GOSHUIN_MAP.has(locationId);
}

/**
 * Get goshuin info for a location.
 */
export function getGoshuinInfo(locationId: string): GoshuinInfo | undefined {
  return GOSHUIN_MAP.get(locationId);
}

/**
 * Check if a location has a notable goshuin.
 */
export function isNotableGoshuin(locationId: string): boolean {
  return GOSHUIN_MAP.get(locationId)?.notable === true;
}
