import type { CityId } from "@/types/trip";

/**
 * Day trip configuration for a destination city
 */
export type DayTripConfig = {
  /**
   * Target city ID for the day trip
   */
  cityId: CityId;
  /**
   * Approximate one-way travel time in minutes
   */
  travelMinutes: number;
  /**
   * Minimum number of days in base city before suggesting this day trip
   * This ensures travelers get a solid experience of the base city first
   */
  minDaysBeforeSuggesting: number;
  /**
   * Brief description for UI display
   */
  description?: string;
};

/**
 * Day trip mappings from base cities to nearby destinations.
 * These are used to provide variety for extended single-city stays
 * and to suggest efficient day trips based on travel times.
 *
 * Cities are ordered by travel time (closest first) for each base city.
 */
export const DAY_TRIP_MAPPINGS: Record<CityId, DayTripConfig[]> = {
  // Kansai region
  kyoto: [
    {
      cityId: "nara",
      travelMinutes: 45,
      minDaysBeforeSuggesting: 4,
      description: "Ancient temples and friendly deer",
    },
    {
      cityId: "osaka",
      travelMinutes: 30,
      minDaysBeforeSuggesting: 5,
      description: "Vibrant food scene and modern attractions",
    },
    {
      cityId: "otsu",
      travelMinutes: 15,
      minDaysBeforeSuggesting: 3,
      description: "Enryakuji temple complex on Mt. Hiei and Lake Biwa shoreline, 15 minutes from central Kyoto",
    },
    {
      cityId: "himeji",
      travelMinutes: 75,
      minDaysBeforeSuggesting: 4,
      description: "One of 12 surviving original castle keeps in Japan, significantly less visited than Kyoto",
    },
  ],
  osaka: [
    {
      cityId: "kobe",
      travelMinutes: 25,
      minDaysBeforeSuggesting: 2,
      description: "Port city with Chinatown, beef, and mountain views",
    },
    {
      cityId: "kyoto",
      travelMinutes: 30,
      minDaysBeforeSuggesting: 3,
      description: "Historic temples and traditional culture",
    },
    {
      cityId: "nara",
      travelMinutes: 50,
      minDaysBeforeSuggesting: 4,
      description: "Ancient capital with deer park",
    },
    {
      cityId: "himeji",
      travelMinutes: 45,
      minDaysBeforeSuggesting: 3,
      description: "Japan's most complete original castle keep, 45 minutes from Osaka by Shinkansen",
    },
    {
      cityId: "wakayama",
      travelMinutes: 90,
      minDaysBeforeSuggesting: 4,
      description: "Koyasan mountain monastery and Kumano pilgrimage routes, 90 minutes south of Osaka",
    },
  ],
  nara: [
    {
      cityId: "kyoto",
      travelMinutes: 45,
      minDaysBeforeSuggesting: 2,
      description: "Temple-filled cultural capital",
    },
    {
      cityId: "osaka",
      travelMinutes: 50,
      minDaysBeforeSuggesting: 3,
      description: "Japan's kitchen and entertainment hub",
    },
    {
      cityId: "wakayama",
      travelMinutes: 110,
      minDaysBeforeSuggesting: 3,
      description: "Koyasan mountain monastery and Kumano pilgrimage coast, accessible from Nara",
    },
  ],
  // Kanto region
  tokyo: [
    {
      cityId: "yokohama",
      travelMinutes: 25,
      minDaysBeforeSuggesting: 4,
      description: "Chinatown and waterfront attractions",
    },
    {
      cityId: "kamakura",
      travelMinutes: 55,
      minDaysBeforeSuggesting: 5,
      description: "Giant Buddha and seaside temples",
    },
    {
      cityId: "hakone",
      travelMinutes: 80,
      minDaysBeforeSuggesting: 5,
      description: "Hot springs with Mt. Fuji views",
    },
    {
      cityId: "nikko",
      travelMinutes: 120,
      minDaysBeforeSuggesting: 6,
      description: "UNESCO World Heritage shrines",
    },
  ],
  yokohama: [
    {
      cityId: "tokyo",
      travelMinutes: 25,
      minDaysBeforeSuggesting: 3,
      description: "Japan's bustling capital",
    },
    {
      cityId: "kamakura",
      travelMinutes: 25,
      minDaysBeforeSuggesting: 2,
      description: "Great Buddha and seaside temple town",
    },
  ],
  // Chubu
  nagoya: [
    {
      cityId: "kyoto",
      travelMinutes: 35,
      minDaysBeforeSuggesting: 3,
      description: "Ancient temples and tea culture",
    },
    {
      cityId: "takayama",
      travelMinutes: 140,
      minDaysBeforeSuggesting: 3,
      description: "Preserved Edo-era merchant town in the mountains",
    },
    {
      cityId: "kanazawa",
      travelMinutes: 180,
      minDaysBeforeSuggesting: 5,
      description: "Samurai districts and Kenrokuen Garden",
    },
  ],
  kanazawa: [
    {
      cityId: "takayama",
      travelMinutes: 120,
      minDaysBeforeSuggesting: 3,
      description: "Hida beef, sake breweries, and morning markets",
    },
    {
      cityId: "toyama",
      travelMinutes: 20,
      minDaysBeforeSuggesting: 2,
      description: "Glass art museum, fresh firefly squid, and waterfront park",
    },
  ],
  takayama: [
    {
      cityId: "kanazawa",
      travelMinutes: 120,
      minDaysBeforeSuggesting: 3,
      description: "Kenrokuen Garden, samurai districts, and gold leaf craft",
    },
  ],
  toyama: [
    {
      cityId: "kanazawa",
      travelMinutes: 20,
      minDaysBeforeSuggesting: 2,
      description: "Kenrokuen Garden and Higashi Chaya geisha district",
    },
  ],
  nagano: [
    {
      cityId: "kawaguchiko",
      travelMinutes: 120,
      minDaysBeforeSuggesting: 3,
      description: "Mt. Fuji views, lakes, and Chureito Pagoda",
    },
    {
      cityId: "takayama",
      travelMinutes: 180,
      minDaysBeforeSuggesting: 4,
      description: "Hida beef, preserved merchant streets, and mountain culture",
    },
  ],
  kawaguchiko: [
    {
      cityId: "tokyo",
      travelMinutes: 110,
      minDaysBeforeSuggesting: 3,
      description: "Shibuya, Shinjuku, and endless dining options",
    },
    {
      cityId: "hakone",
      travelMinutes: 90,
      minDaysBeforeSuggesting: 2,
      description: "Hot springs, Owakudani volcanic valley, and Lake Ashi",
    },
  ],
  hakone: [
    {
      cityId: "tokyo",
      travelMinutes: 80,
      minDaysBeforeSuggesting: 3,
      description: "Return to the capital for museums and nightlife",
    },
    {
      cityId: "kamakura",
      travelMinutes: 60,
      minDaysBeforeSuggesting: 2,
      description: "Great Buddha, seaside temples, and Enoshima Island",
    },
  ],
  kamakura: [
    {
      cityId: "tokyo",
      travelMinutes: 55,
      minDaysBeforeSuggesting: 3,
      description: "Endless districts to explore on a break from the coast",
    },
    {
      cityId: "yokohama",
      travelMinutes: 25,
      minDaysBeforeSuggesting: 2,
      description: "Chinatown, Cup Noodles Museum, and Minato Mirai waterfront",
    },
  ],
  nikko: [
    {
      cityId: "tokyo",
      travelMinutes: 120,
      minDaysBeforeSuggesting: 3,
      description: "Return to Tokyo for a change of pace",
    },
  ],
  // Kyushu
  fukuoka: [
    {
      cityId: "kumamoto",
      travelMinutes: 45,
      minDaysBeforeSuggesting: 3,
      description: "Kumamoto Castle and Suizenji Garden",
    },
    {
      cityId: "nagasaki",
      travelMinutes: 115,
      minDaysBeforeSuggesting: 3,
      description: "Historic port city with Dutch heritage",
    },
  ],
  nagasaki: [
    {
      cityId: "fukuoka",
      travelMinutes: 115,
      minDaysBeforeSuggesting: 3,
      description: "Ramen capital and yatai food stalls",
    },
  ],
  kumamoto: [
    {
      cityId: "fukuoka",
      travelMinutes: 45,
      minDaysBeforeSuggesting: 3,
      description: "Yatai street stalls, tonkotsu ramen, and Canal City",
    },
    {
      cityId: "kagoshima",
      travelMinutes: 50,
      minDaysBeforeSuggesting: 3,
      description: "Sakurajima volcano, black pork, and Sengan-en garden",
    },
  ],
  kagoshima: [
    {
      cityId: "kumamoto",
      travelMinutes: 50,
      minDaysBeforeSuggesting: 3,
      description: "Kumamoto Castle and Aso volcano caldera",
    },
    {
      cityId: "miyazaki",
      travelMinutes: 120,
      minDaysBeforeSuggesting: 4,
      description: "Aoshima shrine island and coastal rock formations",
    },
  ],
  miyazaki: [
    {
      cityId: "kagoshima",
      travelMinutes: 120,
      minDaysBeforeSuggesting: 3,
      description: "Sakurajima volcano views and kurobuta black pork",
    },
  ],
  oita: [
    {
      cityId: "fukuoka",
      travelMinutes: 75,
      minDaysBeforeSuggesting: 3,
      description: "Yatai stalls, tonkotsu ramen, and vibrant nightlife",
    },
    {
      cityId: "kumamoto",
      travelMinutes: 120,
      minDaysBeforeSuggesting: 4,
      description: "Kumamoto Castle and Aso caldera",
    },
  ],
  kitakyushu: [
    {
      cityId: "fukuoka",
      travelMinutes: 15,
      minDaysBeforeSuggesting: 2,
      description: "Yatai stalls, Canal City, and Hakata ramen",
    },
    {
      cityId: "shimonoseki",
      travelMinutes: 15,
      minDaysBeforeSuggesting: 2,
      description: "Fugu pufferfish and Karato Market",
    },
  ],
  // Chugoku
  hiroshima: [
    {
      cityId: "okayama",
      travelMinutes: 40,
      minDaysBeforeSuggesting: 2,
      description: "Korakuen Garden and castle town",
    },
    {
      cityId: "kobe",
      travelMinutes: 70,
      minDaysBeforeSuggesting: 3,
      description: "Harbor city with famous beef",
    },
    {
      cityId: "matsuyama",
      travelMinutes: 160,
      minDaysBeforeSuggesting: 4,
      description: "Dogo Onsen and hilltop castle",
    },
    {
      cityId: "shimonoseki",
      travelMinutes: 70,
      minDaysBeforeSuggesting: 3,
      description: "Fugu pufferfish capital and Kanmon Straits",
    },
  ],
  okayama: [
    {
      cityId: "hiroshima",
      travelMinutes: 40,
      minDaysBeforeSuggesting: 2,
      description: "Peace Memorial Park and Miyajima Island",
    },
    {
      cityId: "takamatsu",
      travelMinutes: 55,
      minDaysBeforeSuggesting: 3,
      description: "Ritsurin Garden and sanuki udon across the Seto Inland Sea",
    },
  ],
  matsue: [
    {
      cityId: "hiroshima",
      travelMinutes: 180,
      minDaysBeforeSuggesting: 4,
      description: "Peace Memorial Park and Miyajima Island",
    },
    {
      cityId: "tottori",
      travelMinutes: 120,
      minDaysBeforeSuggesting: 3,
      description: "Sand dunes, Sand Museum, and coastal scenery",
    },
  ],
  tottori: [
    {
      cityId: "matsue",
      travelMinutes: 120,
      minDaysBeforeSuggesting: 3,
      description: "Matsue Castle, Lafcadio Hearn quarter, and sunset over Lake Shinji",
    },
  ],
  shimonoseki: [
    {
      cityId: "hiroshima",
      travelMinutes: 70,
      minDaysBeforeSuggesting: 2,
      description: "Peace Memorial Park, Miyajima, and Hiroshima okonomiyaki",
    },
    {
      cityId: "kitakyushu",
      travelMinutes: 15,
      minDaysBeforeSuggesting: 2,
      description: "Mojiko retro port district and Kokura Castle",
    },
  ],
  kobe: [
    {
      cityId: "osaka",
      travelMinutes: 25,
      minDaysBeforeSuggesting: 3,
      description: "Street food capital and vibrant nightlife",
    },
    {
      cityId: "kyoto",
      travelMinutes: 50,
      minDaysBeforeSuggesting: 3,
      description: "Zen gardens and geisha districts",
    },
    {
      cityId: "himeji",
      travelMinutes: 40,
      minDaysBeforeSuggesting: 2,
      description: "Japan's most spectacular original castle",
    },
  ],
  himeji: [
    {
      cityId: "kobe",
      travelMinutes: 40,
      minDaysBeforeSuggesting: 2,
      description: "Kobe beef, harbor views, and Kitano foreign quarter",
    },
    {
      cityId: "okayama",
      travelMinutes: 20,
      minDaysBeforeSuggesting: 2,
      description: "Korakuen Garden and Kurashiki canal district",
    },
  ],
  otsu: [
    {
      cityId: "kyoto",
      travelMinutes: 10,
      minDaysBeforeSuggesting: 2,
      description: "Temples, teahouses, and the old imperial capital",
    },
    {
      cityId: "nara",
      travelMinutes: 70,
      minDaysBeforeSuggesting: 3,
      description: "Deer park, Todaiji Great Buddha, and Naramachi district",
    },
  ],
  ise: [
    {
      cityId: "nagoya",
      travelMinutes: 90,
      minDaysBeforeSuggesting: 2,
      description: "Nagoya Castle, miso katsu, and Osu shopping district",
    },
  ],
  wakayama: [
    {
      cityId: "osaka",
      travelMinutes: 60,
      minDaysBeforeSuggesting: 3,
      description: "Street food, Dotonbori, and Shinsekai",
    },
    {
      cityId: "nara",
      travelMinutes: 90,
      minDaysBeforeSuggesting: 3,
      description: "Ancient capital with deer park and Great Buddha",
    },
  ],
  // Hokkaido
  sapporo: [
    {
      cityId: "hakodate",
      travelMinutes: 210,
      minDaysBeforeSuggesting: 4,
      description: "Morning market seafood, Mt. Hakodate night view, and historic port town",
    },
  ],
  hakodate: [
    {
      cityId: "sapporo",
      travelMinutes: 210,
      minDaysBeforeSuggesting: 4,
      description: "Ramen alley, beer garden, and Susukino nightlife",
    },
    {
      cityId: "aomori",
      travelMinutes: 60,
      minDaysBeforeSuggesting: 3,
      description: "Nebuta Museum, Aomori Bay, and fresh apple markets",
    },
  ],
  asahikawa: [
    {
      cityId: "sapporo",
      travelMinutes: 85,
      minDaysBeforeSuggesting: 3,
      description: "Sapporo ramen, Odori Park, and craft beer scene",
    },
  ],
  kushiro: [
    {
      cityId: "abashiri",
      travelMinutes: 180,
      minDaysBeforeSuggesting: 3,
      description: "Drift ice museum, Abashiri Prison, and Sea of Okhotsk coast",
    },
  ],
  abashiri: [
    {
      cityId: "asahikawa",
      travelMinutes: 210,
      minDaysBeforeSuggesting: 3,
      description: "Asahiyama Zoo and Asahikawa ramen village",
    },
  ],
  // Tohoku
  sendai: [
    {
      cityId: "yamagata",
      travelMinutes: 60,
      minDaysBeforeSuggesting: 3,
      description: "Yamadera cliff temple and Zao crater lake",
    },
  ],
  yamagata: [
    {
      cityId: "sendai",
      travelMinutes: 60,
      minDaysBeforeSuggesting: 3,
      description: "Castle ruins, Zuihoden mausoleum, and gyutan beef tongue",
    },
  ],
  aizuwakamatsu: [
    {
      cityId: "sendai",
      travelMinutes: 120,
      minDaysBeforeSuggesting: 3,
      description: "Castle town, Date Masamune history, and gyutan beef tongue",
    },
  ],
  morioka: [
    {
      cityId: "sendai",
      travelMinutes: 40,
      minDaysBeforeSuggesting: 3,
      description: "Tanabata festival city and grilled beef tongue capital",
    },
  ],
  aomori: [
    {
      cityId: "morioka",
      travelMinutes: 100,
      minDaysBeforeSuggesting: 3,
      description: "Wanko soba challenge, castle ruins, and craft beer",
    },
    {
      cityId: "hakodate",
      travelMinutes: 60,
      minDaysBeforeSuggesting: 3,
      description: "Morning market, Mt. Hakodate night view, and historic port",
    },
  ],
  akita: [
    {
      cityId: "morioka",
      travelMinutes: 90,
      minDaysBeforeSuggesting: 3,
      description: "Wanko soba, jajamen noodles, and reimen cold noodles",
    },
    {
      cityId: "sendai",
      travelMinutes: 130,
      minDaysBeforeSuggesting: 4,
      description: "Gyutan beef tongue capital and Zuihoden mausoleum",
    },
  ],
  niigata: [
    {
      cityId: "nagano",
      travelMinutes: 100,
      minDaysBeforeSuggesting: 3,
      description: "Snow monkeys, Zenkoji Temple, and mountain soba",
    },
  ],
  // Shikoku
  matsuyama: [
    {
      cityId: "takamatsu",
      travelMinutes: 155,
      minDaysBeforeSuggesting: 3,
      description: "Ritsurin Garden and sanuki udon",
    },
  ],
  takamatsu: [
    {
      cityId: "matsuyama",
      travelMinutes: 155,
      minDaysBeforeSuggesting: 3,
      description: "Dogo Onsen and castle town charm",
    },
    {
      cityId: "osaka",
      travelMinutes: 105,
      minDaysBeforeSuggesting: 3,
      description: "Japan's kitchen. Takoyaki, okonomiyaki, nightlife",
    },
    {
      cityId: "okayama",
      travelMinutes: 55,
      minDaysBeforeSuggesting: 3,
      description: "Korakuen Garden and Kurashiki canal district",
    },
  ],
  kochi: [
    {
      cityId: "matsuyama",
      travelMinutes: 150,
      minDaysBeforeSuggesting: 3,
      description: "Dogo Onsen, Matsuyama Castle, and literary history",
    },
  ],
  tokushima: [
    {
      cityId: "takamatsu",
      travelMinutes: 70,
      minDaysBeforeSuggesting: 3,
      description: "Ritsurin Garden and legendary sanuki udon",
    },
    {
      cityId: "osaka",
      travelMinutes: 130,
      minDaysBeforeSuggesting: 4,
      description: "Street food, Dotonbori canal, and nightlife",
    },
  ],
  // Okinawa
  naha: [
    {
      cityId: "ishigaki",
      travelMinutes: 90,
      minDaysBeforeSuggesting: 3,
      description: "Yaeyama coral islands and tropical beaches",
    },
  ],
  ishigaki: [],
  // Remote islands / valleys - no practical day trip destinations
  amami: [],
  miyako: [],
  yakushima: [],
  wakkanai: [],
  iyavalley: [],
};

/**
 * Get available day trips from a base city
 * @param baseCityId - The city the traveler is staying in
 * @returns Array of day trip configurations, sorted by travel time
 */
export function getDayTripsFromCity(baseCityId: CityId): DayTripConfig[] {
  return DAY_TRIP_MAPPINGS[baseCityId] ?? [];
}

/**
 * Get day trip suggestions for a specific day number in a city
 * @param baseCityId - The base city
 * @param dayNumberInCity - How many consecutive days the traveler has been in this city
 * @returns Array of suitable day trip suggestions
 */
export function getSuggestedDayTrips(
  baseCityId: CityId,
  dayNumberInCity: number,
): DayTripConfig[] {
  const allTrips = getDayTripsFromCity(baseCityId);
  return allTrips.filter((trip) => dayNumberInCity >= trip.minDaysBeforeSuggesting);
}

/**
 * Check if a day trip should be suggested based on location exhaustion
 * @param baseCityId - The base city
 * @param dayNumberInCity - Days spent in this city
 * @param remainingLocationsInCity - How many unused locations remain
 * @param activitiesPerDay - Target activities per day
 * @returns Suggested day trip or undefined if base city has enough variety
 */
export function shouldSuggestDayTrip(
  baseCityId: CityId,
  dayNumberInCity: number,
  remainingLocationsInCity: number,
  activitiesPerDay: number = 3,
): DayTripConfig | undefined {
  // Suggest day trips when running low on locations (less than 5 days worth).
  // The threshold is generous because the generator's filtering (geographic
  // validation, name dedup, interest matching) reduces effective availability
  // well below the raw unused count.
  //
  // Golden Route cities have hundreds of locations so the default threshold is
  // almost never reached, suppressing variety suggestions. A higher multiplier
  // fires the day-trip check earlier so dispersal destinations surface for
  // travelers spending 3+ days in high-density cities.
  const CROWDED_CITIES = new Set([
    "kyoto",
    "tokyo",
    "osaka",
    "nara",
    "hakone",
    "kamakura",
  ]);
  const pressureMultiplier = CROWDED_CITIES.has(baseCityId) ? 8 : 5;
  const locationsNeeded = activitiesPerDay * pressureMultiplier;
  const isRunningLow = remainingLocationsInCity < locationsNeeded;

  if (!isRunningLow) return undefined;

  const availableTrips = getSuggestedDayTrips(baseCityId, dayNumberInCity);
  return availableTrips[0];
}

/**
 * Calculate total travel overhead for a day trip (round trip in minutes)
 */
export function getDayTripTravelOverhead(trip: DayTripConfig): number {
  return trip.travelMinutes * 2;
}
