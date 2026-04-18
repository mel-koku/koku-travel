/**
 * Festival & Event Calendar
 *
 * ~60 major festivals with date ranges, cities, crowd impact, and suggested activities.
 * Used for festival_alert gap detection and trip warnings.
 */

import { getRegionForCity } from "@/data/regions";

export interface Festival {
  id: string;
  name: string;
  nameJa: string;
  /** City or region ID. May be a KnownCityId or broader region string. */
  city: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  crowdImpact: 1 | 2 | 3 | 4 | 5; // 1 = minimal, 5 = extreme
  category: "matsuri" | "seasonal" | "cultural" | "fireworks" | "illumination" | "food";
  description: string;
  suggestedActivity?: string; // Optional activity suggestion for injection
  /** When true, dates shift year to year. UI should show "around this time" language. */
  isApproximate?: boolean;
}

export const FESTIVALS: readonly Festival[] = [
  // === JANUARY ===
  { id: "toka-ebisu", name: "Toka Ebisu", nameJa: "十日えびす", city: "osaka", startMonth: 1, startDay: 9, endMonth: 1, endDay: 11, crowdImpact: 4, category: "matsuri", description: "Business luck festival at Imamiya Ebisu Shrine. Million+ visitors", suggestedActivity: "Visit Imamiya Ebisu Shrine for lucky bamboo branches" },
  { id: "yamayaki", name: "Wakakusa Yamayaki", nameJa: "若草山焼き", city: "nara", startMonth: 1, startDay: 25, endMonth: 1, endDay: 25, crowdImpact: 3, category: "matsuri", description: "Hillside fire ceremony at Mount Wakakusa with fireworks", suggestedActivity: "Watch Wakakusa Yamayaki from Nara Park" },

  // === FEBRUARY ===
  { id: "sapporo-snow", name: "Sapporo Snow Festival", nameJa: "さっぽろ雪まつり", city: "hokkaido", startMonth: 2, startDay: 4, endMonth: 2, endDay: 11, crowdImpact: 5, category: "seasonal", description: "Massive ice and snow sculptures at Odori Park", suggestedActivity: "Explore Sapporo Snow Festival ice sculptures", isApproximate: true },
  { id: "setsubun", name: "Setsubun at Sensoji", nameJa: "節分会", city: "tokyo", startMonth: 2, startDay: 3, endMonth: 2, endDay: 3, crowdImpact: 3, category: "cultural", description: "Bean-throwing ceremony to drive away evil spirits", suggestedActivity: "Join setsubun bean-throwing at Sensoji Temple" },
  { id: "plum-blossom-kairakuen", name: "Kairakuen Plum Festival", nameJa: "梅まつり", city: "kanto", startMonth: 2, startDay: 17, endMonth: 3, endDay: 31, crowdImpact: 3, category: "seasonal", description: "3,000 plum trees bloom in one of Japan's top gardens" },

  // === MARCH ===
  { id: "omizutori", name: "Omizutori", nameJa: "お水取り", city: "nara", startMonth: 3, startDay: 1, endMonth: 3, endDay: 14, crowdImpact: 4, category: "cultural", description: "Ancient fire ceremony at Todai-ji. Spectacular torch procession", suggestedActivity: "Watch the Omizutori torch ceremony at Todai-ji" },
  { id: "higashiyama-hanatoro", name: "Higashiyama Hanatoro", nameJa: "東山花灯路", city: "kyoto", startMonth: 3, startDay: 8, endMonth: 3, endDay: 17, crowdImpact: 3, category: "illumination", description: "Lantern-lit paths through Higashiyama temple district" },

  // === APRIL ===
  { id: "takayama-spring", name: "Takayama Spring Festival", nameJa: "高山祭（春）", city: "takayama", startMonth: 4, startDay: 14, endMonth: 4, endDay: 15, crowdImpact: 5, category: "matsuri", description: "Elaborate festival floats parade through old town. UNESCO heritage", suggestedActivity: "See the ornate yatai floats of Takayama Spring Festival" },
  { id: "kanamara", name: "Kanamara Matsuri", nameJa: "かなまら祭", city: "kawasaki", startMonth: 4, startDay: 6, endMonth: 4, endDay: 6, crowdImpact: 4, category: "matsuri", description: "Kawasaki's quirky fertility festival. Unique floats" },
  { id: "miyako-odori", name: "Miyako Odori", nameJa: "都をどり", city: "kyoto", startMonth: 4, startDay: 1, endMonth: 4, endDay: 30, crowdImpact: 2, category: "cultural", description: "Geiko and maiko spring dance performances in Gion", suggestedActivity: "Attend a Miyako Odori geisha dance performance" },
  { id: "sakura-osaka", name: "Osaka Mint Bureau Cherry Blossoms", nameJa: "造幣局 桜の通り抜け", city: "osaka", startMonth: 4, startDay: 7, endMonth: 4, endDay: 13, crowdImpact: 4, category: "seasonal", description: "One-week opening with 350+ cherry tree varieties" },

  // === MAY ===
  { id: "sanja-matsuri", name: "Sanja Matsuri", nameJa: "三社祭", city: "tokyo", startMonth: 5, startDay: 16, endMonth: 5, endDay: 18, crowdImpact: 5, category: "matsuri", description: "Tokyo's biggest festival. Wild mikoshi processions around Asakusa", suggestedActivity: "Experience the energy of Sanja Matsuri in Asakusa", isApproximate: true },
  { id: "aoi-matsuri", name: "Aoi Matsuri", nameJa: "葵祭", city: "kyoto", startMonth: 5, startDay: 15, endMonth: 5, endDay: 15, crowdImpact: 4, category: "matsuri", description: "Heian-era imperial procession. Kyoto's oldest festival", suggestedActivity: "Watch the Aoi Matsuri procession along Kamo River" },
  { id: "kanda-matsuri", name: "Kanda Matsuri", nameJa: "神田祭", city: "tokyo", startMonth: 5, startDay: 10, endMonth: 5, endDay: 16, crowdImpact: 4, category: "matsuri", description: "One of Tokyo's three great festivals (odd-numbered years only)", isApproximate: true },
  { id: "hakata-dontaku", name: "Hakata Dontaku", nameJa: "博多どんたく", city: "fukuoka", startMonth: 5, startDay: 3, endMonth: 5, endDay: 4, crowdImpact: 5, category: "matsuri", description: "Golden Week mega-festival. 2 million visitors over 2 days" },

  // === JUNE ===
  { id: "sanno-matsuri", name: "Sanno Matsuri", nameJa: "山王祭", city: "tokyo", startMonth: 6, startDay: 7, endMonth: 6, endDay: 17, crowdImpact: 3, category: "matsuri", description: "Grand shrine procession through central Tokyo (even years)", isApproximate: true },
  { id: "yosakoi-soran", name: "Yosakoi Soran", nameJa: "YOSAKOIソーラン", city: "hokkaido", startMonth: 6, startDay: 8, endMonth: 6, endDay: 12, crowdImpact: 4, category: "matsuri", description: "High-energy dance festival in Sapporo's Odori Park" },

  // === JULY ===
  { id: "gion-matsuri", name: "Gion Matsuri", nameJa: "祇園祭", city: "kyoto", startMonth: 7, startDay: 1, endMonth: 7, endDay: 31, crowdImpact: 5, category: "matsuri", description: "Japan's most famous festival. Month-long with float processions", suggestedActivity: "Explore Gion Matsuri yoiyama street stalls in the evening" },
  { id: "tenjin-matsuri", name: "Tenjin Matsuri", nameJa: "天神祭", city: "osaka", startMonth: 7, startDay: 24, endMonth: 7, endDay: 25, crowdImpact: 5, category: "matsuri", description: "Osaka's biggest festival. River boat procession and fireworks", suggestedActivity: "Watch the Tenjin Matsuri fireworks along Okawa River" },
  { id: "sumida-fireworks", name: "Sumida River Fireworks", nameJa: "隅田川花火大会", city: "tokyo", startMonth: 7, startDay: 27, endMonth: 7, endDay: 27, crowdImpact: 5, category: "fireworks", description: "Tokyo's biggest fireworks show. 20,000 fireworks", isApproximate: true },
  { id: "fuji-rock", name: "Fuji Rock Festival", nameJa: "フジロック", city: "niigata", startMonth: 7, startDay: 25, endMonth: 7, endDay: 27, crowdImpact: 3, category: "cultural", description: "Japan's premier outdoor music festival in the mountains", isApproximate: true },
  { id: "hakata-gion", name: "Hakata Gion Yamakasa", nameJa: "博多祇園山笠", city: "fukuoka", startMonth: 7, startDay: 1, endMonth: 7, endDay: 15, crowdImpact: 4, category: "matsuri", description: "Men race massive floats through Hakata. The finale at dawn is unforgettable", suggestedActivity: "Wake up early for Yamakasa's dramatic dawn race" },

  // === AUGUST ===
  { id: "nebuta", name: "Nebuta Matsuri", nameJa: "ねぶた祭", city: "aomori", startMonth: 8, startDay: 2, endMonth: 8, endDay: 7, crowdImpact: 5, category: "matsuri", description: "Giant illuminated warrior floats parade through Aomori", suggestedActivity: "Join the Nebuta parade as a haneto dancer" },
  { id: "awa-odori", name: "Awa Odori", nameJa: "阿波おどり", city: "tokushima", startMonth: 8, startDay: 12, endMonth: 8, endDay: 15, crowdImpact: 5, category: "matsuri", description: "Japan's largest dance festival in Tokushima", suggestedActivity: "Dance with locals at Awa Odori" },
  { id: "tanabata-sendai", name: "Sendai Tanabata", nameJa: "仙台七夕まつり", city: "sendai", startMonth: 8, startDay: 6, endMonth: 8, endDay: 8, crowdImpact: 4, category: "matsuri", description: "Elaborate paper streamer decorations fill the shopping arcades" },
  { id: "daimonji", name: "Gozan no Okuribi", nameJa: "五山送り火", city: "kyoto", startMonth: 8, startDay: 16, endMonth: 8, endDay: 16, crowdImpact: 5, category: "cultural", description: "Giant bonfires on five mountains. Signaling the end of Obon", suggestedActivity: "Watch Gozan no Okuribi from Kamogawa riverbank" },
  { id: "koenji-awa", name: "Koenji Awa Odori", nameJa: "高円寺阿波おどり", city: "tokyo", startMonth: 8, startDay: 23, endMonth: 8, endDay: 24, crowdImpact: 4, category: "matsuri", description: "Tokyo's biggest street dance festival in Koenji neighborhood" },
  { id: "pikachu-outbreak", name: "Pikachu Outbreak", nameJa: "ピカチュウ大量発生チュウ", city: "yokohama", startMonth: 8, startDay: 8, endMonth: 8, endDay: 14, crowdImpact: 3, category: "cultural", description: "Hundreds of Pikachu march through Yokohama's Minato Mirai", isApproximate: true },

  // === SEPTEMBER ===
  { id: "kishiwada-danjiri", name: "Kishiwada Danjiri", nameJa: "岸和田だんじり祭", city: "osaka", startMonth: 9, startDay: 14, endMonth: 9, endDay: 15, crowdImpact: 5, category: "matsuri", description: "Massive wooden carts race through narrow streets at breakneck speed", suggestedActivity: "Watch the thrilling Danjiri float turns" },

  // === OCTOBER ===
  { id: "takayama-autumn", name: "Takayama Autumn Festival", nameJa: "高山祭（秋）", city: "takayama", startMonth: 10, startDay: 9, endMonth: 10, endDay: 10, crowdImpact: 5, category: "matsuri", description: "Autumn counterpart with illuminated evening floats", suggestedActivity: "See the illuminated yatai floats of Takayama Autumn Festival" },
  { id: "nagasaki-kunchi", name: "Nagasaki Kunchi", nameJa: "長崎くんち", city: "nagasaki", startMonth: 10, startDay: 7, endMonth: 10, endDay: 9, crowdImpact: 4, category: "matsuri", description: "Chinese-influenced dragon dances at Suwa Shrine" },
  { id: "jidai-matsuri", name: "Jidai Matsuri", nameJa: "時代祭", city: "kyoto", startMonth: 10, startDay: 22, endMonth: 10, endDay: 22, crowdImpact: 4, category: "matsuri", description: "Historical costume parade spanning 1,000 years of Kyoto", suggestedActivity: "Watch the Jidai Matsuri procession from Heian Shrine to Imperial Palace" },
  { id: "nada-kenka", name: "Nada no Kenka Matsuri", nameJa: "灘のけんか祭り", city: "kansai", startMonth: 10, startDay: 14, endMonth: 10, endDay: 15, crowdImpact: 4, category: "matsuri", description: "Fighting festival. Mikoshi slam into each other in Himeji" },
  { id: "kawagoe-matsuri", name: "Kawagoe Festival", nameJa: "川越まつり", city: "kawagoe", startMonth: 10, startDay: 19, endMonth: 10, endDay: 20, crowdImpact: 4, category: "matsuri", description: "Spectacular float confrontations in Little Edo" },

  // === NOVEMBER ===
  { id: "shichi-go-san", name: "Shichi-Go-San", nameJa: "七五三", city: "tokyo", startMonth: 11, startDay: 15, endMonth: 11, endDay: 15, crowdImpact: 3, category: "cultural", description: "Children's rite of passage. Shrines full of families in kimono", suggestedActivity: "See kimono-clad children at Meiji Shrine for Shichi-Go-San", isApproximate: true },
  { id: "autumn-leaves-kyoto", name: "Kyoto Autumn Illumination", nameJa: "紅葉ライトアップ", city: "kyoto", startMonth: 11, startDay: 10, endMonth: 12, endDay: 10, crowdImpact: 5, category: "illumination", description: "Temples open at night for illuminated autumn foliage", suggestedActivity: "Visit an evening koyo illumination at Eikando or Tofuku-ji" },
  { id: "karatsu-kunchi", name: "Karatsu Kunchi", nameJa: "唐津くんち", city: "kyushu", startMonth: 11, startDay: 2, endMonth: 11, endDay: 4, crowdImpact: 4, category: "matsuri", description: "Lacquered float procession. UNESCO Intangible Heritage" },
  { id: "tori-no-ichi", name: "Tori no Ichi", nameJa: "酉の市", city: "tokyo", startMonth: 11, startDay: 1, endMonth: 11, endDay: 30, crowdImpact: 3, category: "matsuri", description: "Rooster Day fair. Buy ornamental kumade rakes for luck", isApproximate: true },

  // === DECEMBER ===
  { id: "chichibu-night", name: "Chichibu Night Festival", nameJa: "秩父夜祭", city: "kanto", startMonth: 12, startDay: 2, endMonth: 12, endDay: 3, crowdImpact: 4, category: "matsuri", description: "One of Japan's three great float festivals. Spectacular fireworks", suggestedActivity: "See the Chichibu Night Festival's fireworks and floats" },
  { id: "kobe-luminarie", name: "Kobe Luminarie", nameJa: "神戸ルミナリエ", city: "kobe", startMonth: 12, startDay: 6, endMonth: 12, endDay: 15, crowdImpact: 4, category: "illumination", description: "Memorial illumination with millions of lights", suggestedActivity: "Walk through the Kobe Luminarie light tunnel" },
  { id: "nabana-no-sato", name: "Nabana no Sato", nameJa: "なばなの里", city: "kuwana", startMonth: 10, startDay: 19, endMonth: 5, endDay: 31, crowdImpact: 3, category: "illumination", description: "Japan's largest illumination. Millions of LEDs in Mie" },

  // === Fireworks (summer) ===
  { id: "omagari-fireworks", name: "Omagari Fireworks", nameJa: "大曲の花火", city: "tohoku", startMonth: 8, startDay: 30, endMonth: 8, endDay: 30, crowdImpact: 5, category: "fireworks", description: "Japan's top fireworks competition. Pyrotechnic masters", isApproximate: true },
  { id: "nagaoka-fireworks", name: "Nagaoka Fireworks", nameJa: "長岡花火", city: "niigata", startMonth: 8, startDay: 2, endMonth: 8, endDay: 3, crowdImpact: 5, category: "fireworks", description: "Emotional peace memorial fireworks. The phoenix rises" },
  { id: "miyajima-fireworks", name: "Miyajima Water Fireworks", nameJa: "宮島水中花火大会", city: "hiroshima", startMonth: 8, startDay: 24, endMonth: 8, endDay: 24, crowdImpact: 4, category: "fireworks", description: "Fireworks reflected in the sea around the floating torii" },

  // === Food Festivals ===
  { id: "sapporo-autumn-fest", name: "Sapporo Autumn Fest", nameJa: "さっぽろオータムフェスト", city: "hokkaido", startMonth: 9, startDay: 6, endMonth: 9, endDay: 29, crowdImpact: 3, category: "food", description: "Hokkaido's best food and drink at Odori Park stalls" },
  { id: "osaka-food-expo", name: "Osaka Food Expo", nameJa: "食博覧会", city: "osaka", startMonth: 4, startDay: 25, endMonth: 5, endDay: 6, crowdImpact: 3, category: "food", description: "Massive food fair during Golden Week (held every 4 years)", isApproximate: true },

  // === Cherry Blossom Peaks (approximate, varies by year) ===
  { id: "sakura-tokyo", name: "Cherry Blossom Peak (Tokyo)", nameJa: "桜（東京）", city: "tokyo", startMonth: 3, startDay: 25, endMonth: 4, endDay: 5, crowdImpact: 4, category: "seasonal", description: "Ueno Park, Chidorigafuchi, and Meguro River packed with hanami parties", suggestedActivity: "Enjoy hanami under cherry blossoms at a Tokyo park", isApproximate: true },
  { id: "sakura-kyoto", name: "Cherry Blossom Peak (Kyoto)", nameJa: "桜（京都）", city: "kyoto", startMonth: 3, startDay: 28, endMonth: 4, endDay: 10, crowdImpact: 5, category: "seasonal", description: "Philosopher's Path, Maruyama Park, Kiyomizu-dera. Peak hanami crowds", suggestedActivity: "Walk the Philosopher's Path during cherry blossom season", isApproximate: true },
  { id: "sakura-osaka", name: "Cherry Blossom Peak (Osaka)", nameJa: "桜（大阪）", city: "osaka", startMonth: 3, startDay: 27, endMonth: 4, endDay: 7, crowdImpact: 4, category: "seasonal", description: "Osaka Castle Park and Kema Sakuranomiya. Festive hanami atmosphere", isApproximate: true },
  { id: "sakura-hokkaido", name: "Cherry Blossom Peak (Hokkaido)", nameJa: "桜（北海道）", city: "hokkaido", startMonth: 5, startDay: 1, endMonth: 5, endDay: 15, crowdImpact: 3, category: "seasonal", description: "Late-blooming sakura at Matsumae and Goryokaku", isApproximate: true },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find festivals overlapping a specific date.
 */
export function getFestivalsForDate(month: number, day: number): Festival[] {
  return FESTIVALS.filter((f) => isInFestivalPeriod(month, day, f));
}

/**
 * Find festivals overlapping a trip date range in a specific city.
 */
export function getFestivalsForTrip(
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
  city?: string
): Festival[] {
  return FESTIVALS.filter((f) => {
    const overlaps = periodsOverlap(
      startMonth, startDay, endMonth, endDay,
      f.startMonth, f.startDay, f.endMonth, f.endDay
    );
    if (!overlaps) return false;
    if (!city) return true;
    // Exact city match
    if (f.city === city) return true;
    // Region-level match: festival city is in same region as user's city
    const userRegion = getRegionForCity(city);
    const festivalRegion = getRegionForCity(f.city);
    return !!(userRegion && festivalRegion && userRegion === festivalRegion);
  });
}

/**
 * Find festivals for a specific day (month + day) and city.
 */
export function getFestivalsForDay(
  month: number,
  day: number,
  city: string
): Festival[] {
  return FESTIVALS.filter(
    (f) => f.city === city && isInFestivalPeriod(month, day, f)
  );
}

function isInFestivalPeriod(month: number, day: number, f: Festival): boolean {
  const d = month * 100 + day;
  const s = f.startMonth * 100 + f.startDay;
  const e = f.endMonth * 100 + f.endDay;

  if (s <= e) return d >= s && d <= e;
  return d >= s || d <= e;
}

function periodsOverlap(
  m1s: number, d1s: number, m1e: number, d1e: number,
  m2s: number, d2s: number, m2e: number, d2e: number
): boolean {
  const encode = (m: number, d: number) => m * 100 + d;
  const s1 = encode(m1s, d1s), e1 = encode(m1e, d1e);
  const s2 = encode(m2s, d2s), e2 = encode(m2e, d2e);

  // Simple case: neither wraps
  if (s1 <= e1 && s2 <= e2) {
    return s1 <= e2 && s2 <= e1;
  }
  // If either wraps, check if any endpoint falls in the other period
  return (
    isInRange(s1, s2, e2) || isInRange(e1, s2, e2) ||
    isInRange(s2, s1, e1) || isInRange(e2, s1, e1)
  );
}

function isInRange(d: number, start: number, end: number): boolean {
  if (start <= end) return d >= start && d <= end;
  return d >= start || d <= end;
}

// ---------------------------------------------------------------------------
// Near-miss detection (C10)
// ---------------------------------------------------------------------------

export type NearMissDirection = "forward" | "backward";

export interface FestivalNearMiss {
  festival: Festival;
  direction: NearMissDirection;
  /**
   * Positive integer.
   * - forward: days between trip end and festival start
   * - backward: days between festival end and trip start
   */
  gapDays: number;
}

interface NearMissOptions {
  forwardWindow?: number;
  backwardWindow?: number;
}

const NEAR_MISS_REF_YEAR = 2025;

function mdToDayOfYear(month: number, day: number): number {
  const date = new Date(NEAR_MISS_REF_YEAR, month - 1, day);
  const start = new Date(NEAR_MISS_REF_YEAR, 0, 1);
  return Math.round((date.getTime() - start.getTime()) / 86_400_000) + 1;
}

function daysFromTo(m1: number, d1: number, m2: number, d2: number): number {
  const a = mdToDayOfYear(m1, d1);
  const b = mdToDayOfYear(m2, d2);
  let delta = b - a;
  if (delta < 0) delta += 365;
  return delta;
}

export function getFestivalNearMisses(
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
  cities: readonly string[],
  options: NearMissOptions = {},
): FestivalNearMiss[] {
  if (cities.length === 0) return [];

  const forwardWindow = options.forwardWindow ?? 3;
  const backwardWindow = options.backwardWindow ?? 2;

  const results: FestivalNearMiss[] = [];

  for (const f of FESTIVALS) {
    if (f.crowdImpact < 4) continue;
    if (!cities.includes(f.city)) continue;

    const overlaps = periodsOverlap(
      startMonth, startDay, endMonth, endDay,
      f.startMonth, f.startDay, f.endMonth, f.endDay,
    );
    if (overlaps) continue;

    const forwardGap = daysFromTo(endMonth, endDay, f.startMonth, f.startDay);
    const backwardGap = daysFromTo(f.endMonth, f.endDay, startMonth, startDay);

    if (forwardGap > 0 && forwardGap <= forwardWindow) {
      results.push({ festival: f, direction: "forward", gapDays: forwardGap });
    } else if (backwardGap > 0 && backwardGap <= backwardWindow) {
      results.push({ festival: f, direction: "backward", gapDays: backwardGap });
    }
  }

  results.sort((a, b) => {
    if (b.festival.crowdImpact !== a.festival.crowdImpact) {
      return b.festival.crowdImpact - a.festival.crowdImpact;
    }
    if (a.gapDays !== b.gapDays) return a.gapDays - b.gapDays;
    if (a.direction !== b.direction) return a.direction === "forward" ? -1 : 1;
    return a.festival.id.localeCompare(b.festival.id);
  });

  return results;
}
