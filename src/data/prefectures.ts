/**
 * Prefecture groupings for Japanese cities, organized by region.
 *
 * Used to group cities under prefecture headers in the trip builder
 * region detail panel. The source structure maps
 * region → prefecture → city names (from cityInterests.json).
 */

// Region → ordered prefectures → city names belonging to each prefecture
const PREFECTURE_DATA: Record<string, Record<string, string[]>> = {
  Hokkaido: {
    Hokkaido: [
      "Furano", "Sapporo", "Kamikawa", "Hakodate", "Kushiro", "Biei",
      "Abashiri", "Teshikaga", "Otaru", "Shari", "Wakkanai", "Shiraoi",
      "Tomakomai", "Yoichi", "Kamifurano", "Rausu", "Urahoro", "Hokuryu",
      "Toyako", "Nakafurano", "Obihiro", "Asahikawa", "Otofuke", "Rishiri",
      "Betsukai", "Rusutsu", "Rishirifuji", "Kamoenai", "Chitose", "Sobetsu",
      "Shimukappu", "Nanae", "Kiyosato", "Nemuro", "Okushiri District",
      "Erimo", "Akaigawa", "Kitami", "Matsumae", "Mombetsu",
    ],
  },

  Tohoku: {
    Aomori: [
      "Aomori", "Towada", "Fukaura", "Goshogawara", "Hachinohe",
      "Sotogahama", "Shingo", "Mutsu", "Kuroishi", "Nakatsugaru",
      "Hirosaki", "Sai", "Oma", "Nishimeya",
    ],
    Iwate: [
      "Iwate", "Morioka", "Hachimantai", "Hiraizumi", "Iwaizumi",
      "Kitakami", "Tono", "Takizawa", "Oshu", "Ofunato", "Hanamaki",
    ],
    Miyagi: [
      "Miyagi", "Sendai", "Ishinomaki", "Kurihara", "Kesennuma",
    ],
    Akita: [
      "Akita", "Senboku", "Yokote", "Odate", "Kazuno", "Oga",
    ],
    Yamagata: [
      "Yamagata", "Sakata", "Yonezawa", "Tsuruoka", "Obanazawa",
      "Yuza", "Kaminoyama", "Yama", "Shinjo", "Tendo", "Tozawa",
      "Nanyo", "Zao",
    ],
    Fukushima: [
      "Fukushima", "Aizuwakamatsu", "Kitashiobara", "Kitakata",
      "Tamura", "Nihonmatsu", "Shimogo", "Hinoemata", "Minami Aizu",
      "Bandai",
    ],
  },

  Kanto: {
    Tokyo: [
      "Tokyo", "Ome", "Hachijo Town", "Miyake", "Niijima", "Ogasawara",
      "Shibuya",
    ],
    Kanagawa: [
      "Yokohama", "Kamakura", "Hakone", "Kawasaki", "Yokosuka", "Odawara",
      "Fujisawa", "Ashigarashimo", "Samukawa", "Isehara", "Sagamihara",
    ],
    Saitama: [
      "Saitama", "Kawagoe", "Chichibu", "Gyoda", "Kasugabe", "Omiya",
      "Kumagaya", "Tokorozawa",
    ],
    Chiba: [
      "Chiba", "Choshi", "Futtsu", "Tateyama", "Narita", "Kamogawa",
      "Ichihara", "Katori", "Mobara", "Kimitsu", "Kisarazu",
      "Minami boso", "Otaki", "Kyonan", "Kujukuri", "Sakura", "Ohara",
      "Noda", "Urayasu",
    ],
    Ibaraki: [
      "Mito", "Tsukuba", "Daigo", "Oarai", "Kasama", "Joso",
      "Hitachinaka", "Ushiku", "Hitachiota", "Itako", "Hitachi",
    ],
    Tochigi: [
      "Nikko", "Utsunomiya", "Nasu", "Nasushiobara", "Motegi",
      "Mashiko", "Ashikaga",
    ],
    Gunma: [
      "Annaka", "Maebashi", "Kusatsu", "Minakami", "Numata", "Nakanojo",
      "Kiryu", "Agatsuma", "Fujioka", "Katashina", "Naganohara",
      "Tomioka", "Shibukawa", "Takasaki", "Tsumagoi",
    ],
  },

  Chubu: {
    Niigata: [
      "Niigata", "Sado", "Myoko", "Joetsu", "Tokamachi", "Nagaoka",
      "Shibata", "Uonuma", "Yahiko", "Sanjo", "Minamiuonuma", "Tsubame",
      "Ojiya", "Agano", "Iwafune", "Nakauonuma", "Gosen", "Tsunan",
      "Yuzawa",
    ],
    Toyama: [
      "Toyama", "Kurobe", "Tonami", "Himi", "Namerikawa", "Takaoka",
      "Nanto", "Nakaniikawa",
    ],
    Ishikawa: [
      "Ishikawa", "Nanao", "Kaga", "Suzu", "Hakui", "Shika", "Komatsu",
      "Hakusan", "Noto", "Ishikawa-ken",
    ],
    Fukui: [
      "Fukui", "Tsuruga", "Obama", "Katsuyama", "Awara", "Echizen",
      "Mikatakaminaka",
    ],
    Yamanashi: [
      "Hokuto", "Fujikawaguchiko", "Kofu", "Fujiyoshida", "Minamikoma",
      "Narusawa", "Ichikawamisato", "Yamanakako", "Oshino", "Kai",
      "Naruwasa", "Hayakawa", "Koshu", "Minamitsuru", "Minobu",
      "Fujikawa",
    ],
    Nagano: [
      "Nagano", "Matsumoto", "Suwa", "Ueda", "Yamanouchi", "Kiso", "Ina",
      "Iida", "Karuizawa", "Hakuba", "Kitaazumi", "Nozawaonsen",
      "Shiomotakai", "Shiojiri", "Azumino", "Komagane", "Omachi",
      "Chikuma", "Aoki", "Azumi", "Yamanochi", "Obuse", "Chino",
      "Kitasaku", "Miyada", "Achi",
    ],
    Gifu: [
      "Gifu", "Takayama", "Hida", "Seki", "Gujo", "Nakatsugawa",
      "Motosu", "Fuwa", "Kakamigahara", "Tajimi", "Ogaki", "Mino", "Gero",
      "Ikeda",
    ],
    Shizuoka: [
      "Shizuoka", "Shimoda", "Ito", "Atami", "Kakegawa", "Izu",
      "Nishiizu", "Higashiizu", "Gotenba", "Kawanehon", "Kawazu",
      "Fukuroi", "Hara", "Susono", "Minamiizu", "Hamamatsu", "Izunokuni",
      "Oi", "Oyama", "Fujinomiya",
    ],
    Aichi: [
      "Aichi", "Nagoya", "Toyota", "Toyohashi", "Seto", "Inuyama",
      "Okazaki", "Nagakute", "Tokoname", "Nishio", "Gamagori", "Komaki",
      "Nisshin", "Kiyosu", "Inazawa", "Shinshiro", "Toyokawa",
    ],
  },

  Kansai: {
    Kyoto: [
      "Kyoto", "Uji", "Ine", "Miyazu", "Yosano", "Kameoka", "Kitayama",
      "Kasagi",
    ],
    Osaka: [
      "Osaka", "Sakai", "Minoh", "Suita", "Hirakata", "Kishiwada",
      "Izumisano", "Tajiri", "Itami",
    ],
    Hyogo: [
      "Kobe", "Himeji", "Nishinomiya", "Akashi", "Toyooka", "Ono",
      "Sumoto", "Takarazuka", "Ako", "Minamiawaji", "Asago", "Sasayama",
      "Awaji", "Kakogawa",
    ],
    Nara: [
      "Nara", "Ikoma", "Yoshino", "Sakurai", "Ikaruga", "Asuka", "Tenri",
      "Katsuragi", "Kashihara", "Heguri", "Gose", "Mount Yoshino",
      "Takatori", "Uda", "Taishi", "Yamatokoriyama",
    ],
    Mie: [
      "Mie", "Ise", "Shima", "Matsusaka", "Iga", "Suzuka", "Toba", "Tsu",
      "Kuwana", "Yokkaichi", "Komono", "Nabari", "Kumano",
    ],
    Shiga: [
      "Otsu", "Shiga", "Nagahama", "Koka", "Omihachiman", "Hikone",
      "Takashima", "Aisho", "Higashiomi",
    ],
    Wakayama: [
      "Wakayama", "Shirahama", "Tanabe", "Nachikatsuura", "Koya",
      "Mihama", "Shingu", "Tenkawa", "Komoro", "Tomogashima", "Iwade",
      "Koya-san", "Kozagawa", "Totsukawa", "Hidakagawa", "Arida",
      "Nachi-Katsuur",
    ],
  },

  Chugoku: {
    Tottori: [
      "Tottori", "Kurayoshi", "Daisen", "Misasa", "Kotoura", "Wakasa",
      "Yonago", "Tohaku", "Yurihama", "Saihaku", "Hoki", "Iwami",
    ],
    Shimane: [
      "Shimane", "Matsue", "Izumo", "Tsuwano", "Okinoshima", "Oda",
      "Hamada", "Masuda", "Okuizumo", "Ama", "Kanoashi−gun Tsuwano−cho",
      "Urago Nishinoshima", "Oki", "Unnan", "Nishinoshima",
    ],
    Okayama: [
      "Okayama", "Kurashiki", "Bizen", "Maniwa", "Tsuyama", "Takahashi",
      "Soja", "Setouchi", "Niimi", "Mimasaka",
    ],
    Hiroshima: [
      "Hiroshima", "Fukuyama", "Kure", "Hatsukaichi", "Onomichi",
      "Takehara", "Shobara", "Jinseki Kogen", "Akiota",
    ],
    Yamaguchi: [
      "Yamaguchi", "Shimonoseki", "Hagi", "Mine", "Nagato", "Hofu",
    ],
  },

  Shikoku: {
    Tokushima: [
      "Tokushima", "Naruto", "Yoshinogawa", "Awa", "Kamiyama", "Kaiyo",
      "Mima", "Kamikatsu", "Katsuura", "Kamiita", "Aizumi", "Anan",
      "Mugi", "Hidaka",
    ],
    Kagawa: [
      "Takamatsu", "Mitoyo", "Marugame", "Kanonji", "Kotohira",
      "Shodoshima", "Higashikagawa", "Sanuki", "Kagawa", "Utazu",
      "Tonosho", "Naoshima", "Zentsuji", "Ayagawa", "Shozu District",
      "Tadotsu", "Sakaide", "Manno",
    ],
    Ehime: [
      "Matsuyama", "Imabari", "Uwajima", "Kumakogen", "Uchiko", "Saijo",
      "Ozu", "Tobe", "Ehime", "Shikokuchuo", "Niihama", "Seiyo", "Ochi",
      "Kamijima", "Iyo", "Matsuno",
    ],
    Kochi: [
      "Kochi", "Shimanto", "Miyoshi", "Muroto", "Yusuhara", "Tosa",
      "Nakatosa", "Tosashimizu", "Niyodogawa", "Kami", "Ino", "Sukumo",
      "Susaki", "Nankoku", "Sakawa", "Motoyama", "Kitagawa", "Otsuki",
      "Yasuda",
    ],
  },

  Kyushu: {
    Fukuoka: [
      "Fukuoka", "Kitakyushu", "Itoshima", "Kurume", "Dazaifu",
      "Munakata", "Yanagawa", "Miyako", "Soeda", "Asakura", "Tagawa",
    ],
    Saga: [
      "Saga", "Karatsu", "Ogi", "Takeo", "Yoshinogari", "Taku",
      "Ureshino", "Arita",
    ],
    Nagasaki: [
      "Nagasaki", "Unzen", "Sasebo", "Hirado", "Goto", "Shimabara",
      "Tsushima", "Omura", "Iki",
    ],
    Kumamoto: [
      "Kumamoto", "Aso", "Minamiaso", "Hitoyoshi", "Mizukami",
      "Uchinomaki", "Amakusa", "Minamata", "Yatsushiro", "Uki",
      "Kikuchi-shi and Yamaga", "Yamaga",
    ],
    Oita: [
      "Oita", "Beppu", "Taketa", "Usuki", "Bungotakada", "Yufu", "Hita",
      "Nakatsu", "Kokonoe", "Kitsuki", "Sekinoo", "Bungoono", "Usa",
      "Takeda",
    ],
    Miyazaki: [
      "Miyazaki", "Hyuga", "Kushima", "Takachiho", "Aya", "Saito",
      "Miyazaki-ken", "Ebino", "Nichinan", "Miyakonojo",
    ],
    Kagoshima: [
      "Kagoshima", "Oshima", "Yakushima", "Ibusuki", "Kirishima",
      "Minamiosumi", "Yoron", "Minamitane", "Yakushima Island",
      "Miyanoura", "Isa", "Minamikyushu", "Waifu", "Kuma",
    ],
  },

  Okinawa: {
    Okinawa: [
      "Nago", "Naha", "Onna", "Uruma", "Ishigaki", "Nanjo", "Yomitan",
      "Chatan", "Motobu", "Okinawa", "Itoman", "Taketomi", "Zamami",
      "Yaeyama", "Yonaguni", "Tomigusuku", "Shimajiri", "Nakijin", "Ie",
      "Kumejima", "Tokashiki", "Tonaki", "Nishihara", "Izena",
      "Minamidaito", "Kunigami", "Aguni", "Ginowan", "Nakagusuku",
      "Yubu Island", "Kitadaitō", "Nakagusuku-son", "Kunigami-son",
      "Nakijin-son", "Itoma", "Yaeyama District",
    ],
  },
};

// Build the inverse lookup: city name → prefecture name
const _cityToPrefecture = new Map<string, string>();
for (const prefectures of Object.values(PREFECTURE_DATA)) {
  for (const [prefecture, cities] of Object.entries(prefectures)) {
    for (const city of cities) {
      _cityToPrefecture.set(city, prefecture);
    }
  }
}

/**
 * Look up the prefecture for a given city name.
 * Returns undefined for unmapped cities (they'll appear under "Other").
 */
export function getPrefectureForCity(cityName: string): string | undefined {
  return _cityToPrefecture.get(cityName);
}

/**
 * Get the ordered list of prefectures for a region.
 * Returns undefined for unknown regions.
 */
export function getPrefecturesForRegion(regionName: string): string[] | undefined {
  const data = PREFECTURE_DATA[regionName];
  if (!data) return undefined;
  return Object.keys(data);
}

/**
 * Whether a region has multiple prefectures (and thus needs grouping).
 */
export function regionHasMultiplePrefectures(regionName: string): boolean {
  const prefectures = getPrefecturesForRegion(regionName);
  return !!prefectures && prefectures.length > 1;
}
