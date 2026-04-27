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
  { id: "toka-ebisu", name: "Toka Ebisu", nameJa: "十日えびす", city: "osaka", startMonth: 1, startDay: 9, endMonth: 1, endDay: 11, crowdImpact: 4, category: "matsuri", description: "Three days of business-luck rituals at Imamiya Ebisu Shrine. A million Osakans queue for fukuzasa, lucky bamboo branches hung with gold coins and sea bream, then carry them home for prosperity.", suggestedActivity: "Visit Imamiya Ebisu Shrine for lucky bamboo branches" },
  { id: "yamayaki", name: "Wakakusa Yamayaki", nameJa: "若草山焼き", city: "nara", startMonth: 1, startDay: 25, endMonth: 1, endDay: 25, crowdImpact: 3, category: "matsuri", description: "A hillside set ablaze. Volunteers torch the dry grass of Mount Wakakusa each January, sending fire racing across the slope above Nara Park while fireworks burst overhead.", suggestedActivity: "Watch Wakakusa Yamayaki from Nara Park" },

  // === FEBRUARY ===
  { id: "sapporo-snow", name: "Sapporo Snow Festival", nameJa: "さっぽろ雪まつり", city: "hokkaido", startMonth: 2, startDay: 4, endMonth: 2, endDay: 11, crowdImpact: 5, category: "seasonal", description: "A week of monumental snow and ice sculptures lining Sapporo's Odori Park: castles, anime characters, full-scale buildings carved with chainsaws. Lit at night and walkable in subzero gear.", suggestedActivity: "Walk Odori Park's snow sculptures after dark", isApproximate: true },
  { id: "setsubun", name: "Setsubun at Sensoji", nameJa: "節分会", city: "tokyo", startMonth: 2, startDay: 3, endMonth: 2, endDay: 3, crowdImpact: 3, category: "cultural", description: "The lunar-calendar boundary between winter and spring. At Senso-ji Temple, priests and sumo wrestlers hurl roasted soybeans into the crowd while chanting 'oni wa soto, fuku wa uchi' (demons out, fortune in).", suggestedActivity: "Join setsubun bean-throwing at Sensoji Temple" },
  { id: "plum-blossom-kairakuen", name: "Kairakuen Plum Festival", nameJa: "梅まつり", city: "kanto", startMonth: 2, startDay: 17, endMonth: 3, endDay: 31, crowdImpact: 3, category: "seasonal", description: "Three thousand plum trees bloom at Mito's Kairakuen, one of Japan's three great gardens. Pink and white blossoms a month before sakura, with tea ceremonies in the historic pavilion." },

  // === MARCH ===
  { id: "omizutori", name: "Omizutori", nameJa: "お水取り", city: "nara", startMonth: 3, startDay: 1, endMonth: 3, endDay: 14, crowdImpact: 4, category: "cultural", description: "A 1,250-year unbroken Buddhist fire ritual at Todai-ji. Each evening monks brandish massive flaming pine torches above the temple balcony, showering sparks on the crowd below for protection.", suggestedActivity: "Watch the Omizutori torch ceremony at Todai-ji" },
  { id: "higashiyama-hanatoro", name: "Higashiyama Hanatoro", nameJa: "東山花灯路", city: "kyoto", startMonth: 3, startDay: 8, endMonth: 3, endDay: 17, crowdImpact: 3, category: "illumination", description: "Ten nights of lantern-lit paths through the Higashiyama temple district. Bamboo lanterns line cobblestone streets from Kiyomizu-dera to Yasaka Shrine, with ikebana installations and special evening temple openings." },

  // === APRIL ===
  { id: "takayama-spring", name: "Takayama Spring Festival", nameJa: "高山祭（春）", city: "takayama", startMonth: 4, startDay: 14, endMonth: 4, endDay: 15, crowdImpact: 5, category: "matsuri", description: "One of Japan's most ornate festivals. Twelve UNESCO-listed yatai floats, lacquered and gilded, parade through Takayama's old town by day. After dark, hundreds of paper lanterns illuminate the procession.", suggestedActivity: "See the ornate yatai floats of Takayama Spring Festival" },
  { id: "kanamara", name: "Kanamara Matsuri", nameJa: "かなまら祭", city: "kawasaki", startMonth: 4, startDay: 6, endMonth: 4, endDay: 6, crowdImpact: 4, category: "matsuri", description: "Kawasaki's irreverent fertility festival at Kanayama Shrine. A pink phallic mikoshi is paraded through the streets alongside carved candy in the same shape. Proceeds support HIV research." },
  { id: "miyako-odori", name: "Miyako Odori", nameJa: "都をどり", city: "kyoto", startMonth: 4, startDay: 1, endMonth: 4, endDay: 30, crowdImpact: 2, category: "cultural", description: "Spring dance performances by Gion's geiko and maiko at Kaburenjo Theater. A program of seasonal dances and short kabuki vignettes, dating to 1872. Tea ceremony available before each show.", suggestedActivity: "Attend a Miyako Odori geisha dance performance" },
  { id: "sakura-osaka", name: "Osaka Mint Bureau Cherry Blossoms", nameJa: "造幣局 桜の通り抜け", city: "osaka", startMonth: 4, startDay: 7, endMonth: 4, endDay: 13, crowdImpact: 4, category: "seasonal", description: "One week, once a year, the Osaka Mint Bureau opens its 560-meter cherry-tree alley to the public. 350+ varieties bloom together, including rare double and weeping types found almost nowhere else." },

  // === MAY ===
  { id: "sanja-matsuri", name: "Sanja Matsuri", nameJa: "三社祭", city: "tokyo", startMonth: 5, startDay: 16, endMonth: 5, endDay: 18, crowdImpact: 5, category: "matsuri", description: "Tokyo's wildest festival. Teams of hundreds shoulder portable shrines (mikoshi) through Asakusa's lanes for three days, drums and chants pulsing dawn to dusk around Senso-ji Temple.", suggestedActivity: "Experience the energy of Sanja Matsuri in Asakusa", isApproximate: true },
  { id: "aoi-matsuri", name: "Aoi Matsuri", nameJa: "葵祭", city: "kyoto", startMonth: 5, startDay: 15, endMonth: 5, endDay: 15, crowdImpact: 4, category: "matsuri", description: "Kyoto's oldest festival, born in the 6th century. A 500-strong procession in Heian-era silk court robes walks from the Imperial Palace to the Kamo shrines, ox-drawn carts and all.", suggestedActivity: "Watch the Aoi Matsuri procession along Kamo River" },
  { id: "kanda-matsuri", name: "Kanda Matsuri", nameJa: "神田祭", city: "tokyo", startMonth: 5, startDay: 10, endMonth: 5, endDay: 16, crowdImpact: 4, category: "matsuri", description: "One of Tokyo's three great festivals, held only in odd-numbered years. Hundreds of portable shrines (mikoshi) wind from the financial district to Kanda Shrine, where merchants have prayed for prosperity since the 1600s.", isApproximate: true },
  { id: "hakata-dontaku", name: "Hakata Dontaku", nameJa: "博多どんたく", city: "fukuoka", startMonth: 5, startDay: 3, endMonth: 5, endDay: 4, crowdImpact: 5, category: "matsuri", description: "Two million people pack Fukuoka over Golden Week for Japan's biggest holiday-week festival. Costumed dance troupes parade through the city while spectators clap rice paddles together as percussion." },

  // === JUNE ===
  { id: "sanno-matsuri", name: "Sanno Matsuri", nameJa: "山王祭", city: "tokyo", startMonth: 6, startDay: 7, endMonth: 6, endDay: 17, crowdImpact: 3, category: "matsuri", description: "A 400-year-old grand procession from Hie Shrine through central Tokyo, held only in even-numbered years. Mikoshi pass the National Diet, the Imperial Palace, and the financial district in a single 9-hour parade.", isApproximate: true },
  { id: "yosakoi-soran", name: "Yosakoi Soran", nameJa: "YOSAKOIソーラン", city: "hokkaido", startMonth: 6, startDay: 8, endMonth: 6, endDay: 12, crowdImpact: 4, category: "matsuri", description: "Five days of high-energy team dance battles in Sapporo's Odori Park. Thousands of dancers from across Japan perform original choreography to a single shared song, holding wooden naruko clappers." },

  // === JULY ===
  { id: "gion-matsuri", name: "Gion Matsuri", nameJa: "祇園祭", city: "kyoto", startMonth: 7, startDay: 1, endMonth: 7, endDay: 31, crowdImpact: 5, category: "matsuri", description: "Japan's most famous festival, running the full month. The peak: 23 towering yamaboko floats, some three stories tall, parade through downtown Kyoto on July 17. Yoiyama evenings before the parade fill the streets with food stalls and traditional music.", suggestedActivity: "Explore Gion Matsuri yoiyama street stalls in the evening" },
  { id: "tenjin-matsuri", name: "Tenjin Matsuri", nameJa: "天神祭", city: "osaka", startMonth: 7, startDay: 24, endMonth: 7, endDay: 25, crowdImpact: 5, category: "matsuri", description: "Osaka's biggest festival, dating to the 10th century. A hundred boats lit by lanterns float down the Okawa River carrying mikoshi, with 5,000 fireworks bursting overhead at the climax.", suggestedActivity: "Watch the Tenjin Matsuri fireworks along Okawa River" },
  { id: "sumida-fireworks", name: "Sumida River Fireworks", nameJa: "隅田川花火大会", city: "tokyo", startMonth: 7, startDay: 27, endMonth: 7, endDay: 27, crowdImpact: 5, category: "fireworks", description: "Tokyo's biggest fireworks display. 20,000 shells light the sky over the Sumida River from two launch sites, with the Tokyo Skytree and Senso-ji as the backdrop. A million spectators line the banks.", isApproximate: true },
  { id: "fuji-rock", name: "Fuji Rock Festival", nameJa: "フジロック", city: "niigata", startMonth: 7, startDay: 25, endMonth: 7, endDay: 27, crowdImpact: 3, category: "cultural", description: "Japan's biggest outdoor music festival, held high in the Yuzawa mountains at the Naeba ski resort. Three days, multiple stages, headliners from around the world, and a famously polite crowd.", isApproximate: true },
  { id: "hakata-gion", name: "Hakata Gion Yamakasa", nameJa: "博多祇園山笠", city: "fukuoka", startMonth: 7, startDay: 1, endMonth: 7, endDay: 15, crowdImpact: 4, category: "matsuri", description: "Two weeks of preparation, then one electric finale. Teams of men in fundoshi loincloths race towering 1-ton kakiyama floats through Hakata in a 5km dawn sprint on July 15.", suggestedActivity: "Wake up early for Yamakasa's dramatic dawn race" },

  // === AUGUST ===
  { id: "nebuta", name: "Nebuta Matsuri", nameJa: "ねぶた祭", city: "aomori", startMonth: 8, startDay: 2, endMonth: 8, endDay: 7, crowdImpact: 5, category: "matsuri", description: "Twenty enormous illuminated warrior floats, painted with samurai and demons, are paraded each night through Aomori. Anyone in costume can join the haneto dancers leaping alongside, chanting 'rasse-ra rasse-ra'.", suggestedActivity: "Join the Nebuta parade as a haneto dancer" },
  { id: "awa-odori", name: "Awa Odori", nameJa: "阿波おどり", city: "tokushima", startMonth: 8, startDay: 12, endMonth: 8, endDay: 15, crowdImpact: 5, category: "matsuri", description: "Japan's biggest dance festival, dating to 1586. Thousands of dancers in straw hats and yukata move through Tokushima's streets in synchronized lines to flute and drum, while spectators are pulled in to join.", suggestedActivity: "Dance with locals at Awa Odori" },
  { id: "tanabata-sendai", name: "Sendai Tanabata", nameJa: "仙台七夕まつり", city: "sendai", startMonth: 8, startDay: 6, endMonth: 8, endDay: 8, crowdImpact: 4, category: "matsuri", description: "The largest of Japan's three great Tanabata festivals. Thousands of huge handmade paper streamers in vivid colors hang from bamboo poles throughout Sendai's covered shopping arcades, transforming the city center into a swirling tunnel." },
  { id: "daimonji", name: "Gozan no Okuribi", nameJa: "五山送り火", city: "kyoto", startMonth: 8, startDay: 16, endMonth: 8, endDay: 16, crowdImpact: 5, category: "cultural", description: "On the last night of Obon, ancestral spirits are sent home with fire. Five gigantic kanji characters and shapes are lit on the mountainsides ringing Kyoto, each visible for about thirty minutes after dusk.", suggestedActivity: "Watch Gozan no Okuribi from Kamogawa riverbank" },
  { id: "koenji-awa", name: "Koenji Awa Odori", nameJa: "高円寺阿波おどり", city: "tokyo", startMonth: 8, startDay: 23, endMonth: 8, endDay: 24, crowdImpact: 4, category: "matsuri", description: "Tokyo's biggest street dance festival, held in the indie neighborhood of Koenji. A hundred groups perform Awa Odori choreography down the streets near the station, drawing a million spectators." },
  { id: "pikachu-outbreak", name: "Pikachu Outbreak", nameJa: "ピカチュウ大量発生チュウ", city: "yokohama", startMonth: 8, startDay: 8, endMonth: 8, endDay: 14, crowdImpact: 3, category: "cultural", description: "Hundreds of dancing Pikachu mascots march through Yokohama's Minato Mirai waterfront. Free outdoor performances, water shows, and parades, drawing Pokémon fans of every age from across Asia.", isApproximate: true },

  // === SEPTEMBER ===
  { id: "kishiwada-danjiri", name: "Kishiwada Danjiri", nameJa: "岸和田だんじり祭", city: "osaka", startMonth: 9, startDay: 14, endMonth: 9, endDay: 15, crowdImpact: 5, category: "matsuri", description: "Forty multi-ton wooden carts race through Kishiwada's narrow streets at full sprint. The thrill is the corner turns, where dozens of men haul each cart sideways at speed. Injuries are common.", suggestedActivity: "Watch the thrilling Danjiri float turns" },

  // === OCTOBER ===
  { id: "takayama-autumn", name: "Takayama Autumn Festival", nameJa: "高山祭（秋）", city: "takayama", startMonth: 10, startDay: 9, endMonth: 10, endDay: 10, crowdImpact: 5, category: "matsuri", description: "The autumn counterpart to the spring festival. Eleven UNESCO-listed yatai floats, more delicate than the spring set, parade through Takayama. After dark they're lit by lanterns and drawn through the old town.", suggestedActivity: "See the illuminated yatai floats of Takayama Autumn Festival" },
  { id: "nagasaki-kunchi", name: "Nagasaki Kunchi", nameJa: "長崎くんち", city: "nagasaki", startMonth: 10, startDay: 7, endMonth: 10, endDay: 9, crowdImpact: 4, category: "matsuri", description: "Three days of Chinese-influenced performances at Suwa Shrine: dragon dances, Dutch warship floats, lion dances, all reflecting Nagasaki's history as Japan's only foreign port during the Edo era." },
  { id: "jidai-matsuri", name: "Jidai Matsuri", nameJa: "時代祭", city: "kyoto", startMonth: 10, startDay: 22, endMonth: 10, endDay: 22, crowdImpact: 4, category: "matsuri", description: "A 2,000-person procession in costumes spanning 1,000 years of Kyoto's history, from Heian aristocrats to Meiji-era soldiers. The route runs from the Imperial Palace to Heian Shrine over two hours.", suggestedActivity: "Watch the Jidai Matsuri procession from Heian Shrine to Imperial Palace" },
  { id: "nada-kenka", name: "Nada no Kenka Matsuri", nameJa: "灘のけんか祭り", city: "kansai", startMonth: 10, startDay: 14, endMonth: 10, endDay: 15, crowdImpact: 4, category: "matsuri", description: "Himeji's 'fighting festival.' Three massive mikoshi are deliberately rammed into each other in a frenzied ritual purification at Matsubara Shrine. Damaged shrines are believed to please the gods." },
  { id: "kawagoe-matsuri", name: "Kawagoe Festival", nameJa: "川越まつり", city: "kawagoe", startMonth: 10, startDay: 19, endMonth: 10, endDay: 20, crowdImpact: 4, category: "matsuri", description: "The Edo-era warehouse district of 'Little Edo' fills with 29 tall festival floats. The drama is the hikkawase: when two floats meet, their teams perform competing music and dance, refusing to back down." },

  // === NOVEMBER ===
  { id: "shichi-go-san", name: "Shichi-Go-San", nameJa: "七五三", city: "tokyo", startMonth: 11, startDay: 15, endMonth: 11, endDay: 15, crowdImpact: 3, category: "cultural", description: "A coming-of-age ritual for children aged three, five, and seven. Families dress kids in formal kimono and bring them to shrines like Meiji Jingu for a blessing and chitose-ame, long-life candy.", suggestedActivity: "See kimono-clad children at Meiji Shrine for Shichi-Go-San", isApproximate: true },
  { id: "autumn-leaves-kyoto", name: "Kyoto Autumn Illumination", nameJa: "紅葉ライトアップ", city: "kyoto", startMonth: 11, startDay: 10, endMonth: 12, endDay: 10, crowdImpact: 5, category: "illumination", description: "A month of evening temple openings to view illuminated autumn foliage. Eikan-do, Kodai-ji, Kiyomizu-dera, and others light their gardens after dark, transforming red maples into glowing constellations.", suggestedActivity: "Visit an evening koyo illumination at Eikando or Tofuku-ji" },
  { id: "karatsu-kunchi", name: "Karatsu Kunchi", nameJa: "唐津くんち", city: "kyushu", startMonth: 11, startDay: 2, endMonth: 11, endDay: 4, crowdImpact: 4, category: "matsuri", description: "Fourteen massive lacquered floats shaped like helmets, fish, and demons are pulled through Karatsu by teams in matching happi coats. UNESCO Intangible Cultural Heritage since 2016." },
  { id: "tori-no-ichi", name: "Tori no Ichi", nameJa: "酉の市", city: "tokyo", startMonth: 11, startDay: 1, endMonth: 11, endDay: 30, crowdImpact: 3, category: "matsuri", description: "Three 'Rooster Day' fairs at Otori shrines across Tokyo. Vendors sell ornamental kumade, bamboo rakes decorated with treasure motifs, said to rake in good fortune for the coming year.", isApproximate: true },

  // === DECEMBER ===
  { id: "chichibu-night", name: "Chichibu Night Festival", nameJa: "秩父夜祭", city: "kanto", startMonth: 12, startDay: 2, endMonth: 12, endDay: 3, crowdImpact: 4, category: "matsuri", description: "One of Japan's three great float festivals. Six elaborately decorated yatai floats are pulled up a steep slope to a hilltop shrine on the night of December 3, accompanied by 7,000 fireworks. Often snowing.", suggestedActivity: "See the Chichibu Night Festival's fireworks and floats" },
  { id: "kobe-luminarie", name: "Kobe Luminarie", nameJa: "神戸ルミナリエ", city: "kobe", startMonth: 12, startDay: 6, endMonth: 12, endDay: 15, crowdImpact: 4, category: "illumination", description: "A memorial illumination installed every December since the 1995 Kobe earthquake. 200,000 hand-painted lights form a glowing tunnel and rose-window cathedral, walked through by millions of visitors.", suggestedActivity: "Walk through the Kobe Luminarie light tunnel" },
  { id: "nabana-no-sato", name: "Nabana no Sato", nameJa: "なばなの里", city: "kuwana", startMonth: 10, startDay: 19, endMonth: 5, endDay: 31, crowdImpact: 3, category: "illumination", description: "Japan's largest illumination, set in a flower park outside Nagoya. Eight million LEDs form themed light tunnels and changing nightly tableaux of Mount Fuji, ocean waves, and the aurora." },

  // === Fireworks (summer) ===
  { id: "omagari-fireworks", name: "Omagari Fireworks", nameJa: "大曲の花火", city: "tohoku", startMonth: 8, startDay: 30, endMonth: 8, endDay: 30, crowdImpact: 5, category: "fireworks", description: "Japan's most prestigious fireworks competition. Twenty-eight pyrotechnic masters spend a year preparing single original pieces, judged by jury and set to original music. Ninety minutes of unmatched precision.", isApproximate: true },
  { id: "nagaoka-fireworks", name: "Nagaoka Fireworks", nameJa: "長岡花火", city: "niigata", startMonth: 8, startDay: 2, endMonth: 8, endDay: 3, crowdImpact: 5, category: "fireworks", description: "Two emotional nights of fireworks over the Shinano River, including the iconic Phoenix shells honoring those lost to wartime bombing and the 2004 Chuetsu earthquake. The shells are some of Japan's largest." },
  { id: "miyajima-fireworks", name: "Miyajima Water Fireworks", nameJa: "宮島水中花火大会", city: "hiroshima", startMonth: 8, startDay: 24, endMonth: 8, endDay: 24, crowdImpact: 4, category: "fireworks", description: "5,000 fireworks burst over the sea around Itsukushima Shrine's floating torii gate. Watched from boats or the shore of Miyajima island, with reflections doubling every shell on the water." },

  // === Food Festivals ===
  { id: "sapporo-autumn-fest", name: "Sapporo Autumn Fest", nameJa: "さっぽろオータムフェスト", city: "hokkaido", startMonth: 9, startDay: 6, endMonth: 9, endDay: 29, crowdImpact: 3, category: "food", description: "A month-long outdoor food market at Odori Park celebrating Hokkaido's autumn harvest. Crab, sea urchin, melon, dairy, regional sake, and craft beer from every corner of the prefecture." },
  { id: "osaka-food-expo", name: "Osaka Food Expo", nameJa: "食博覧会", city: "osaka", startMonth: 4, startDay: 25, endMonth: 5, endDay: 6, crowdImpact: 3, category: "food", description: "A massive food fair at Intex Osaka held every four years. Hundreds of stalls representing every Japanese region, plus international guest cuisines, packed into the Golden Week holiday window.", isApproximate: true },

  // === Cherry Blossom Peaks (approximate, varies by year) ===
  { id: "sakura-tokyo", name: "Cherry Blossom Peak (Tokyo)", nameJa: "桜（東京）", city: "tokyo", startMonth: 3, startDay: 25, endMonth: 4, endDay: 5, crowdImpact: 4, category: "seasonal", description: "Tokyo's hanami peak. Ueno Park, Chidorigafuchi moat, and the Meguro River canal fill with picnickers under tunnels of pink. Boats, food stalls, and night-illuminated trees from sunset.", suggestedActivity: "Enjoy hanami under cherry blossoms at a Tokyo park", isApproximate: true },
  { id: "sakura-kyoto", name: "Cherry Blossom Peak (Kyoto)", nameJa: "桜（京都）", city: "kyoto", startMonth: 3, startDay: 28, endMonth: 4, endDay: 10, crowdImpact: 5, category: "seasonal", description: "Kyoto's cherry blossom peak. Crowds along the Philosopher's Path, Maruyama Park, and Kiyomizu-dera. Maruyama's giant weeping cherry is lit at night, glowing pink against the dark sky.", suggestedActivity: "Walk the Philosopher's Path during cherry blossom season", isApproximate: true },
  { id: "sakura-osaka", name: "Cherry Blossom Peak (Osaka)", nameJa: "桜（大阪）", city: "osaka", startMonth: 3, startDay: 27, endMonth: 4, endDay: 7, crowdImpact: 4, category: "seasonal", description: "Osaka's hanami peak. Osaka Castle Park and the Kema Sakuranomiya Park along the Okawa River, where boats float beneath a 4km canopy of pink. Picnic atmosphere, food stalls, and sake.", isApproximate: true },
  { id: "sakura-hokkaido", name: "Cherry Blossom Peak (Hokkaido)", nameJa: "桜（北海道）", city: "hokkaido", startMonth: 5, startDay: 1, endMonth: 5, endDay: 15, crowdImpact: 3, category: "seasonal", description: "Late-blooming sakura in Hokkaido, three to four weeks after Honshu. Goryokaku Park's star-shaped fortress and the cherry tunnels of Matsumae are the prefecture's two great viewing spots.", isApproximate: true },
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

/**
 * Look up a festival by its ID.
 */
export function getFestivalById(id: string): Festival | undefined {
  return FESTIVALS.find((f) => f.id === id);
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * Format a festival's date range for display, e.g. "May 15", "May 16–18",
 * "Oct 19 – Nov 4". Uses an en-dash for ranges.
 */
export function formatFestivalDateRange(festival: Festival): string {
  const start = MONTH_LABELS[festival.startMonth - 1];
  const end = MONTH_LABELS[festival.endMonth - 1];
  if (!start || !end) return "";
  if (festival.startMonth === festival.endMonth && festival.startDay === festival.endDay) {
    return `${start} ${festival.startDay}`;
  }
  if (festival.startMonth === festival.endMonth) {
    return `${start} ${festival.startDay}–${festival.endDay}`;
  }
  return `${start} ${festival.startDay} – ${end} ${festival.endDay}`;
}

/**
 * Compute which day(s) of a trip a festival falls on. Returns 1-indexed day
 * numbers, or null if the festival doesn't overlap the trip.
 *
 * Tolerates trips spanning year boundaries via the festival's wrap-aware
 * isInFestivalPeriod check.
 */
export function getFestivalTripDays(
  festival: Festival,
  tripStartIso: string,
  tripEndIso: string,
): { firstDay: number; lastDay: number } | null {
  const startParts = tripStartIso.split("-").map(Number);
  const endParts = tripEndIso.split("-").map(Number);
  if (startParts.length !== 3 || endParts.length !== 3) return null;
  const [sy, sm, sd] = startParts;
  const [ey, em, ed] = endParts;
  if (!sy || !sm || !sd || !ey || !em || !ed) return null;

  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (end.getTime() < start.getTime()) return null;

  let firstDay: number | null = null;
  let lastDay: number | null = null;
  const cursor = new Date(start);
  let dayIdx = 1;
  // Cap at a reasonable max to avoid runaway loops on bad input.
  const MAX_DAYS = 90;
  while (cursor.getTime() <= end.getTime() && dayIdx <= MAX_DAYS) {
    if (isInFestivalPeriod(cursor.getMonth() + 1, cursor.getDate(), festival)) {
      if (firstDay === null) firstDay = dayIdx;
      lastDay = dayIdx;
    }
    cursor.setDate(cursor.getDate() + 1);
    dayIdx++;
  }
  if (firstDay === null || lastDay === null) return null;
  return { firstDay, lastDay };
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

/**
 * Festivals must hit this crowdImpact level to be worth a near-miss recommendation.
 * Below this, the festival isn't significant enough to suggest reshaping the trip.
 */
const HIGH_IMPACT_THRESHOLD = 4;

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
    if (f.crowdImpact < HIGH_IMPACT_THRESHOLD) continue;
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
