/**
 * Omiyage (Souvenir) Guide Data
 *
 * ~60 iconic souvenirs across 17 cities.
 * Used for omiyage_reminder gap detection suggestions.
 */

import type { KnownCityId } from "@/types/trip";

export interface Omiyage {
  id: string;
  name: string;
  nameJa: string;
  city: KnownCityId | string;
  category: "sweets" | "snack" | "crafts" | "drink" | "food";
  priceRange: string;
  whereToBuy: string;
  description?: string;
}

export const OMIYAGE_GUIDE: readonly Omiyage[] = [
  // Tokyo
  { id: "tokyo-banana", name: "Tokyo Banana", nameJa: "東京ばな奈", city: "tokyo", category: "sweets", priceRange: "¥600-1,200", whereToBuy: "Tokyo Station, airports", description: "Banana-shaped sponge cake with custard" },
  { id: "tokyo-hiyoko", name: "Hiyoko Manju", nameJa: "ひよ子", city: "tokyo", category: "sweets", priceRange: "¥500-1,000", whereToBuy: "Tokyo Station, department stores" },
  { id: "tokyo-shiroi-koibito", name: "Shiro Coppe", nameJa: "シロコッペ", city: "tokyo", category: "sweets", priceRange: "¥800-1,500", whereToBuy: "Tokyo Station Gransta" },
  { id: "tokyo-kaminari-okoshi", name: "Kaminari Okoshi", nameJa: "雷おこし", city: "tokyo", category: "snack", priceRange: "¥300-800", whereToBuy: "Asakusa shops near Sensoji", description: "Traditional puffed rice crackers" },

  // Kyoto
  { id: "kyoto-yatsuhashi", name: "Yatsuhashi", nameJa: "八ツ橋", city: "kyoto", category: "sweets", priceRange: "¥500-1,200", whereToBuy: "Kyoto Station, Nishiki Market", description: "Cinnamon-flavored mochi triangles — Kyoto's top souvenir" },
  { id: "kyoto-matcha-langues", name: "Matcha Langue de Chat", nameJa: "茶の菓", city: "kyoto", category: "sweets", priceRange: "¥1,000-2,000", whereToBuy: "Malebranche shops" },
  { id: "kyoto-pickles", name: "Kyoto Tsukemono", nameJa: "京漬物", city: "kyoto", category: "food", priceRange: "¥500-1,500", whereToBuy: "Nishiki Market", description: "Artisan pickled vegetables" },
  { id: "kyoto-kiyomizu-pottery", name: "Kiyomizu-yaki Pottery", nameJa: "清水焼", city: "kyoto", category: "crafts", priceRange: "¥1,000-10,000", whereToBuy: "Kiyomizu-zaka slope" },

  // Osaka
  { id: "osaka-551-butaman", name: "551 Horai Butaman", nameJa: "551蓬莱 豚まん", city: "osaka", category: "food", priceRange: "¥400-1,500", whereToBuy: "551 Horai shops, Shin-Osaka Station", description: "Famous pork buns — quintessential Osaka gift" },
  { id: "osaka-baton-dor", name: "Baton d'Or", nameJa: "バトンドール", city: "osaka", category: "snack", priceRange: "¥500-1,500", whereToBuy: "Hankyu/Takashimaya dept stores", description: "Premium Glico Pocky sticks" },
  { id: "osaka-rikuro-cheesecake", name: "Rikuro's Cheesecake", nameJa: "りくろーおじさん", city: "osaka", category: "sweets", priceRange: "¥800", whereToBuy: "Rikuro shops (Namba, Shin-Osaka)" },

  // Hiroshima
  { id: "hiroshima-momiji-manju", name: "Momiji Manju", nameJa: "もみじ饅頭", city: "hiroshima", category: "sweets", priceRange: "¥500-1,200", whereToBuy: "Miyajima island, Hiroshima Station", description: "Maple leaf-shaped cakes with red bean filling" },
  { id: "hiroshima-lemon-cake", name: "Setouchi Lemon Cake", nameJa: "瀬戸内レモンケーキ", city: "hiroshima", category: "sweets", priceRange: "¥800-1,500", whereToBuy: "Hiroshima Station" },

  // Fukuoka
  { id: "fukuoka-hakata-torimon", name: "Hakata Torimon", nameJa: "博多通りもん", city: "fukuoka", category: "sweets", priceRange: "¥500-1,500", whereToBuy: "Hakata Station, airports", description: "White bean paste milk manju — Japan's #1 selling souvenir" },
  { id: "fukuoka-mentaiko", name: "Mentaiko", nameJa: "明太子", city: "fukuoka", category: "food", priceRange: "¥1,000-3,000", whereToBuy: "Hakata Station, Fukuya shops", description: "Spicy pollock roe — Hakata's signature flavor" },
  { id: "fukuoka-niwaka-senbei", name: "Niwaka Senbei", nameJa: "二○加煎餅", city: "fukuoka", category: "snack", priceRange: "¥500-1,000", whereToBuy: "Hakata Station" },

  // Hokkaido / Sapporo
  { id: "sapporo-shiroi-koibito", name: "Shiroi Koibito", nameJa: "白い恋人", city: "sapporo", category: "sweets", priceRange: "¥700-2,000", whereToBuy: "New Chitose Airport, Sapporo shops", description: "White chocolate cookies — Hokkaido's most famous souvenir" },
  { id: "sapporo-royce", name: "Royce Chocolate", nameJa: "ロイズ", city: "sapporo", category: "sweets", priceRange: "¥800-2,500", whereToBuy: "New Chitose Airport, Royce shops", description: "Nama chocolate and chocolate-covered chips" },
  { id: "sapporo-marusei-butter", name: "Marusei Butter Sandwich", nameJa: "マルセイバターサンド", city: "sapporo", category: "sweets", priceRange: "¥600-1,500", whereToBuy: "Rokkatei shops, airports" },
  { id: "sapporo-jaga-pokkuru", name: "Jaga Pokkuru", nameJa: "じゃがポックル", city: "sapporo", category: "snack", priceRange: "¥800-1,200", whereToBuy: "New Chitose Airport", description: "Hokkaido potato sticks — often sells out" },

  // Hakodate
  { id: "hakodate-trappist-cookies", name: "Trappist Cookies", nameJa: "トラピストクッキー", city: "hakodate", category: "sweets", priceRange: "¥500-1,200", whereToBuy: "Hakodate Station, airport" },

  // Kanazawa
  { id: "kanazawa-gold-leaf", name: "Gold Leaf Crafts", nameJa: "金箔工芸", city: "kanazawa", category: "crafts", priceRange: "¥500-5,000", whereToBuy: "Higashi Chaya district", description: "Kanazawa produces 99% of Japan's gold leaf" },
  { id: "kanazawa-kintsuba", name: "Kintsuba", nameJa: "きんつば", city: "kanazawa", category: "sweets", priceRange: "¥500-1,500", whereToBuy: "Morihachi, Kanazawa Station" },

  // Nagoya
  { id: "nagoya-uiro", name: "Uiro", nameJa: "ういろう", city: "nagoya", category: "sweets", priceRange: "¥500-1,200", whereToBuy: "Nagoya Station", description: "Steamed rice cake in various flavors" },
  { id: "nagoya-shachihoko", name: "Shachihoko Senbei", nameJa: "しゃちほこせんべい", city: "nagoya", category: "snack", priceRange: "¥500-1,000", whereToBuy: "Nagoya Station, Nagoya Castle" },
  { id: "nagoya-yuka-shrimp", name: "Yuka Shrimp Crackers", nameJa: "ゆかり", city: "nagoya", category: "snack", priceRange: "¥500-1,500", whereToBuy: "Nagoya Station", description: "Whole shrimp crackers — crunchy and savory" },

  // Nara
  { id: "nara-deer-cookies", name: "Deer Cookies", nameJa: "鹿サブレ", city: "nara", category: "sweets", priceRange: "¥400-800", whereToBuy: "Nara Park area shops" },

  // Kobe
  { id: "kobe-fugetsudo", name: "Fugetsudo Gaufre", nameJa: "風月堂 ゴーフル", city: "kobe", category: "sweets", priceRange: "¥800-2,000", whereToBuy: "Fugetsudo shops, Sannomiya" },
  { id: "kobe-sake", name: "Nada Sake", nameJa: "灘の酒", city: "kobe", category: "drink", priceRange: "¥1,000-5,000", whereToBuy: "Nada sake district, Kobe Station", description: "Japan's premier sake-brewing region" },

  // Yokohama
  { id: "yokohama-chinatown-manju", name: "Yokohama Manju", nameJa: "横浜中華まん", city: "yokohama", category: "food", priceRange: "¥400-1,000", whereToBuy: "Yokohama Chinatown" },

  // Nagasaki
  { id: "nagasaki-castella", name: "Castella", nameJa: "カステラ", city: "nagasaki", category: "sweets", priceRange: "¥800-2,500", whereToBuy: "Fukusaya, Bunmeido shops", description: "Portuguese-origin sponge cake — Nagasaki's signature" },

  // Sendai
  { id: "sendai-zunda-mochi", name: "Zunda Mochi", nameJa: "ずんだ餅", city: "sendai", category: "sweets", priceRange: "¥500-1,200", whereToBuy: "Sendai Station, Zunda Saryo", description: "Edamame paste on mochi" },
  { id: "sendai-gyutan", name: "Gyutan Jerky", nameJa: "牛たんジャーキー", city: "sendai", category: "food", priceRange: "¥800-1,500", whereToBuy: "Sendai Station" },

  // Matsuyama (Shikoku)
  { id: "matsuyama-tart", name: "Ichiroku Tart", nameJa: "一六タルト", city: "matsuyama", category: "sweets", priceRange: "¥500-1,200", whereToBuy: "Matsuyama Station, airports" },

  // Takamatsu (Shikoku)
  { id: "takamatsu-udon", name: "Sanuki Udon Set", nameJa: "讃岐うどんセット", city: "takamatsu", category: "food", priceRange: "¥500-1,500", whereToBuy: "Takamatsu Station", description: "Take home Kagawa's famous udon" },

  // Naha (Okinawa)
  { id: "naha-chinsuko", name: "Chinsuko", nameJa: "ちんすこう", city: "naha", category: "sweets", priceRange: "¥500-1,500", whereToBuy: "Naha Airport, Kokusai-dori", description: "Traditional Okinawan shortbread cookies" },
  { id: "naha-beni-imo-tart", name: "Beni Imo Tart", nameJa: "紅いもタルト", city: "naha", category: "sweets", priceRange: "¥600-1,500", whereToBuy: "Naha Airport, Okashi Goten", description: "Purple sweet potato tart — vibrant and delicious" },
  { id: "naha-awamori", name: "Awamori", nameJa: "泡盛", city: "naha", category: "drink", priceRange: "¥1,000-5,000", whereToBuy: "Kokusai-dori shops, duty free" },

  // Takayama
  { id: "takayama-sarubobo", name: "Sarubobo Charm", nameJa: "さるぼぼ", city: "takayama", category: "crafts", priceRange: "¥300-2,000", whereToBuy: "Takayama old town shops", description: "Traditional faceless monkey doll — good luck charm" },
  { id: "takayama-sake", name: "Hida Sake", nameJa: "飛騨の酒", city: "takayama", category: "drink", priceRange: "¥1,000-3,000", whereToBuy: "Old town sake breweries" },

  // Hakone
  { id: "hakone-black-eggs", name: "Owakudani Black Eggs", nameJa: "黒たまご", city: "hakone", category: "food", priceRange: "¥500", whereToBuy: "Owakudani volcanic area only", description: "Boiled in sulfur springs — said to add 7 years to your life" },
  { id: "hakone-yosegi", name: "Yosegi Zaiku", nameJa: "寄木細工", city: "hakone", category: "crafts", priceRange: "¥1,000-10,000", whereToBuy: "Hatajuku area, Hakone-Yumoto", description: "Traditional wooden mosaic crafts" },

  // Kamakura
  { id: "kamakura-hato-sable", name: "Hato Sablé", nameJa: "鳩サブレー", city: "kamakura", category: "sweets", priceRange: "¥500-1,500", whereToBuy: "Toshimaya shops near Kamakura Station", description: "Pigeon-shaped butter cookies — since 1894" },

  // Nikko
  { id: "nikko-yuba", name: "Nikko Yuba", nameJa: "日光ゆば", city: "nikko", category: "food", priceRange: "¥800-2,000", whereToBuy: "Shops near Toshogu Shrine" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a city-keyed lookup for fast access.
 */
const OMIYAGE_BY_CITY = new Map<string, Omiyage[]>();
for (const item of OMIYAGE_GUIDE) {
  const existing = OMIYAGE_BY_CITY.get(item.city) ?? [];
  existing.push(item);
  OMIYAGE_BY_CITY.set(item.city, existing);
}

/**
 * Get top omiyage for a city.
 */
export function getOmiyageForCity(
  cityId: string,
  maxResults: number = 3,
): Omiyage[] {
  return (OMIYAGE_BY_CITY.get(cityId) ?? []).slice(0, maxResults);
}

/**
 * Format omiyage items for display in a smart prompt.
 */
export function formatOmiyageItems(items: Omiyage[]): Array<{ name: string; nameJa: string }> {
  return items.map((i) => ({ name: i.name, nameJa: i.nameJa }));
}
