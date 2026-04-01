/**
 * Ekiben (Station Bento) Guide
 *
 * ~50 famous ekiben across major shinkansen stations.
 * Used for pro tips on long train segments and TravelSegment badges.
 */

export interface Ekiben {
  id: string;
  name: string;
  nameJa: string;
  station: string;     // Station name
  stationCity: string; // KnownCityId or city name
  price: string;       // Approximate price
  description: string;
}

export const EKIBEN: readonly Ekiben[] = [
  // Tokyo Station
  { id: "makunouchi-tokyo", name: "Tokyo Makunouchi", nameJa: "東京名物弁当", station: "Tokyo", stationCity: "tokyo", price: "¥1,350", description: "Classic multi-compartment bento showcasing Tokyo flavors" },
  { id: "chicken-bento", name: "Torimeshi", nameJa: "鶏めし弁当", station: "Tokyo", stationCity: "tokyo", price: "¥900", description: "Savory chicken over seasoned rice. A bestseller at Tokyo Station" },
  { id: "gyuutan-bento", name: "Beef Tongue Bento", nameJa: "牛たん弁当", station: "Tokyo", stationCity: "tokyo", price: "¥1,500", description: "Sendai-style grilled beef tongue. Available at Gransta" },
  { id: "shumi-no-ekiben", name: "Ekiben Matsuri Selection", nameJa: "駅弁屋 祭", station: "Tokyo", stationCity: "tokyo", price: "¥900–1,800", description: "Gransta's famous ekiben shop stocks 200+ varieties from across Japan" },

  // Kyoto Station
  { id: "kyoto-makunouchi", name: "Kyoto Makunouchi", nameJa: "京のおばんざい弁当", station: "Kyoto", stationCity: "kyoto", price: "¥1,200", description: "Elegant Kyoto home-style dishes in a compact bento" },
  { id: "saba-sushi", name: "Saba Sushi", nameJa: "鯖寿司", station: "Kyoto", stationCity: "kyoto", price: "¥1,300", description: "Pressed mackerel sushi wrapped in bamboo leaves" },

  // Shin-Osaka Station
  { id: "tako-meshi", name: "Tako Meshi", nameJa: "たこめし", station: "Shin-Osaka", stationCity: "osaka", price: "¥1,100", description: "Octopus rice bento. Osaka's seafood tradition" },
  { id: "kani-sushi", name: "Kani Sushi Bento", nameJa: "かにずし", station: "Shin-Osaka", stationCity: "osaka", price: "¥1,300", description: "Crab sushi from the Sea of Japan coast" },
  { id: "hippo-bento", name: "Hippo no Bento", nameJa: "ひっぱりだこ飯", station: "Shin-Osaka", stationCity: "osaka", price: "¥1,180", description: "Octopus pot rice in a ceramic jar you can keep" },

  // Nagoya Station
  { id: "miso-katsu-bento", name: "Miso Katsu Bento", nameJa: "味噌カツ弁当", station: "Nagoya", stationCity: "nagoya", price: "¥1,050", description: "Crispy tonkatsu with sweet red miso sauce. Nagoya specialty" },
  { id: "tenmusu", name: "Tenmusu", nameJa: "天むす", station: "Nagoya", stationCity: "nagoya", price: "¥780", description: "Small rice balls with shrimp tempura tucked inside" },
  { id: "hitsumabushi-bento", name: "Hitsumabushi Bento", nameJa: "ひつまぶし弁当", station: "Nagoya", stationCity: "nagoya", price: "¥1,400", description: "Nagoya's famous grilled eel on rice" },

  // Kanazawa Station
  { id: "kanazawa-kani", name: "Kanazawa Crab Bento", nameJa: "かにめし", station: "Kanazawa", stationCity: "kanazawa", price: "¥1,300", description: "Fresh snow crab from the Sea of Japan" },
  { id: "oshizushi", name: "Pressed Sushi", nameJa: "押し寿司", station: "Kanazawa", stationCity: "kanazawa", price: "¥1,200", description: "Beautifully layered pressed sushi with seasonal fish" },

  // Sendai Station
  { id: "gyutan-sendai", name: "Gyutan Bento", nameJa: "牛たん弁当", station: "Sendai", stationCity: "tohoku", price: "¥1,200", description: "The original beef tongue bento. Sendai's pride" },
  { id: "harako-meshi", name: "Harako Meshi", nameJa: "はらこめし", station: "Sendai", stationCity: "tohoku", price: "¥1,150", description: "Salmon and salmon roe over seasoned rice" },

  // Hakodate Station
  { id: "ikameshi", name: "Ikameshi", nameJa: "いかめし", station: "Hakodate", stationCity: "hokkaido", price: "¥780", description: "Whole squid stuffed with glutinous rice. Legendary Hokkaido ekiben" },
  { id: "kani-meshi", name: "Kani Meshi", nameJa: "かにめし", station: "Hakodate", stationCity: "hokkaido", price: "¥1,180", description: "Hokkaido crab over rice. Simple and delicious" },

  // Sapporo Station
  { id: "ikura-bento", name: "Ikura Bento", nameJa: "いくら弁当", station: "Sapporo", stationCity: "hokkaido", price: "¥1,380", description: "Glistening salmon roe bento. Hokkaido luxury" },
  { id: "sanshoku-bento", name: "Three-Color Bento", nameJa: "三色弁当", station: "Sapporo", stationCity: "hokkaido", price: "¥1,200", description: "Salmon, crab, and uni on a bed of rice" },

  // Hiroshima Station
  { id: "anago-meshi", name: "Anago Meshi", nameJa: "あなごめし", station: "Hiroshima", stationCity: "hiroshima", price: "¥1,944", description: "Grilled conger eel on rice. Miyajima's signature dish" },
  { id: "hiroshima-oyster", name: "Kaki Meshi", nameJa: "牡蠣めし", station: "Hiroshima", stationCity: "hiroshima", price: "¥1,200", description: "Hiroshima oyster bento. Rich umami flavors" },

  // Fukuoka (Hakata) Station
  { id: "kashiwa-meshi", name: "Kashiwa Meshi", nameJa: "かしわめし", station: "Hakata", stationCity: "fukuoka", price: "¥770", description: "Chicken rice bento. Kyushu comfort food classic" },
  { id: "mentaiko-bento", name: "Mentaiko Bento", nameJa: "明太子弁当", station: "Hakata", stationCity: "fukuoka", price: "¥1,050", description: "Spicy pollock roe over rice. Hakata's signature" },

  // Niigata Station
  { id: "sake-no-kunsei", name: "Smoked Salmon Bento", nameJa: "鮭の焼漬弁当", station: "Niigata", stationCity: "niigata", price: "¥1,100", description: "Niigata's famous rice with grilled marinated salmon" },
  { id: "shu-bomb", name: "Shu Bomb", nameJa: "シューボム", station: "Niigata", stationCity: "niigata", price: "¥1,200", description: "Legendary cream puff you can only get at the station" },

  // Yokohama Station
  { id: "shumai-bento", name: "Shumai Bento", nameJa: "シウマイ弁当", station: "Yokohama", stationCity: "yokohama", price: "¥860", description: "Kiyoken's iconic shumai bento. A 100+ year tradition" },

  // Takayama Station
  { id: "hida-beef-sushi", name: "Hida Beef Sushi", nameJa: "飛騨牛握り", station: "Takayama", stationCity: "takayama", price: "¥1,300", description: "Premium Hida wagyu beef sushi at the station" },

  // Toyama Station
  { id: "masu-no-sushi", name: "Masu no Sushi", nameJa: "鱒寿司", station: "Toyama", stationCity: "toyama", price: "¥1,500", description: "Pressed trout sushi in a wooden container. Toyama icon" },

  // Nagano Station
  { id: "oyaki-set", name: "Oyaki Set", nameJa: "おやきセット", station: "Nagano", stationCity: "nagano", price: "¥800", description: "Grilled stuffed dumplings with various fillings. Shinshu specialty" },

  // Matsumoto Station
  { id: "soba-bento", name: "Shinshu Soba Bento", nameJa: "信州そば弁当", station: "Matsumoto", stationCity: "matsumoto", price: "¥900", description: "Cold soba noodles in a travel-friendly bento format" },

  // Okayama Station
  { id: "matsuri-sushi", name: "Matsuri Sushi", nameJa: "祭り寿司", station: "Okayama", stationCity: "okayama", price: "¥1,100", description: "Colorful sushi scattered with seasonal toppings" },

  // Kobe Station
  { id: "kobe-beef-bento", name: "Kobe Beef Bento", nameJa: "神戸牛弁当", station: "Shin-Kobe", stationCity: "kobe", price: "¥2,000", description: "Sliced Kobe beef over rice. Worth the premium" },

  // Himeji Station
  { id: "anago-himeji", name: "Himeji Anago Sushi", nameJa: "姫路あなご寿司", station: "Himeji", stationCity: "kansai", price: "¥1,100", description: "Pressed conger eel sushi. A Himeji station classic" },

  // Kumamoto Station
  { id: "basashi-bento", name: "Basashi Bento", nameJa: "馬刺し弁当", station: "Kumamoto", stationCity: "kyushu", price: "¥1,200", description: "Horse meat sashimi bento. Unique Kumamoto delicacy" },

  // Kagoshima Station
  { id: "kurobuta-bento", name: "Kurobuta Bento", nameJa: "黒豚弁当", station: "Kagoshima-Chuo", stationCity: "kyushu", price: "¥1,100", description: "Berkshire black pork bento. Kagoshima's famous breed" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Normalize station names for matching (lowercase, no spaces/hyphens)
const normalizeStation = (s: string) => s.toLowerCase().replace(/[\s-]/g, "");

const EKIBEN_BY_STATION = new Map<string, Ekiben[]>();
for (const ekiben of EKIBEN) {
  const key = normalizeStation(ekiben.station);
  const arr = EKIBEN_BY_STATION.get(key) ?? [];
  arr.push(ekiben);
  EKIBEN_BY_STATION.set(key, arr);
}

/**
 * Get ekiben available at a station. Matches by normalized station name.
 */
export function getEkibenForStation(stationName: string): Ekiben[] {
  const key = normalizeStation(stationName);
  return EKIBEN_BY_STATION.get(key) ?? [];
}

/**
 * Get ekiben available in a city (matches by stationCity field).
 */
export function getEkibenForCity(cityId: string): Ekiben[] {
  return EKIBEN.filter((e) => e.stationCity === cityId);
}

/**
 * Check if a station has ekiben available.
 */
export function hasEkibenAtStation(stationName: string): boolean {
  return getEkibenForStation(stationName).length > 0;
}

/**
 * Get all station names that have ekiben.
 */
export function getEkibenStations(): string[] {
  return [...new Set(EKIBEN.map((e) => e.station))];
}
