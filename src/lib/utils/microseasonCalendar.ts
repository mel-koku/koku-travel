/**
 * 72 microseasons (七十二候 / shichijūni-kō) — the Edo-era 1685 adaptation
 * by Shibukawa Shunkai of the Chinese sekki calendar to Japan's climate.
 *
 * Each kō is roughly 5 days, nested inside one of the 24 sekki (solar
 * terms). Boundary dates shift ±1 day year-to-year based on the solar
 * calendar; the entries below use the modal calendar dates that most
 * published references converge on. Acceptable drift for editorial
 * garnish — not load-bearing for routing or scoring.
 *
 * Used as a quiet cultural marker beneath the SeasonalSpotlight heading.
 * Not a filter, not a taxonomy — a single italicized line of provenance.
 */

export type Microseason = {
  /** 1-72, ordered from Risshun (Feb 4) onward. */
  ordinal: number;
  /** Parent sekki (1 of 24), e.g. "Risshun". */
  sekki: string;
  /** Kanji name as written in the original calendar. */
  kanji: string;
  /** Romaji transliteration with macrons. */
  romaji: string;
  /** Short English gloss. Concrete; sensory; sentence-case. */
  english: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
};

export const MICROSEASONS: Microseason[] = [
  // 立春 Risshun — Beginning of Spring
  { ordinal: 1, sekki: "Risshun", kanji: "東風解凍", romaji: "Harukaze kōri o toku", english: "East winds thaw the ice", startMonth: 2, startDay: 4, endMonth: 2, endDay: 8 },
  { ordinal: 2, sekki: "Risshun", kanji: "黄鶯睍睆", romaji: "Kōō kenkan su", english: "Bush warblers begin to sing", startMonth: 2, startDay: 9, endMonth: 2, endDay: 13 },
  { ordinal: 3, sekki: "Risshun", kanji: "魚上氷", romaji: "Uo kōri o izuru", english: "Fish emerge from the ice", startMonth: 2, startDay: 14, endMonth: 2, endDay: 18 },

  // 雨水 Usui — Rain Water
  { ordinal: 4, sekki: "Usui", kanji: "土脉潤起", romaji: "Tsuchi no shō uruoi okoru", english: "Rain moistens the soil", startMonth: 2, startDay: 19, endMonth: 2, endDay: 23 },
  { ordinal: 5, sekki: "Usui", kanji: "霞始靆", romaji: "Kasumi hajimete tanabiku", english: "Mist starts to linger", startMonth: 2, startDay: 24, endMonth: 2, endDay: 28 },
  { ordinal: 6, sekki: "Usui", kanji: "草木萌動", romaji: "Sōmoku mebae izuru", english: "Grasses and trees sprout", startMonth: 3, startDay: 1, endMonth: 3, endDay: 5 },

  // 啓蟄 Keichitsu — Awakening of Insects
  { ordinal: 7, sekki: "Keichitsu", kanji: "蟄虫啓戸", romaji: "Sugomori mushi to o hiraku", english: "Hibernating insects surface", startMonth: 3, startDay: 6, endMonth: 3, endDay: 10 },
  { ordinal: 8, sekki: "Keichitsu", kanji: "桃始笑", romaji: "Momo hajimete saku", english: "First peach blossoms", startMonth: 3, startDay: 11, endMonth: 3, endDay: 15 },
  { ordinal: 9, sekki: "Keichitsu", kanji: "菜虫化蝶", romaji: "Namushi chō to naru", english: "Caterpillars become butterflies", startMonth: 3, startDay: 16, endMonth: 3, endDay: 20 },

  // 春分 Shunbun — Spring Equinox
  { ordinal: 10, sekki: "Shunbun", kanji: "雀始巣", romaji: "Suzume hajimete sukuu", english: "Sparrows start to nest", startMonth: 3, startDay: 21, endMonth: 3, endDay: 25 },
  { ordinal: 11, sekki: "Shunbun", kanji: "桜始開", romaji: "Sakura hajimete saku", english: "First cherry blossoms", startMonth: 3, startDay: 26, endMonth: 3, endDay: 30 },
  { ordinal: 12, sekki: "Shunbun", kanji: "雷乃発声", romaji: "Kaminari sunawachi koe o hassu", english: "Distant thunder", startMonth: 3, startDay: 31, endMonth: 4, endDay: 4 },

  // 清明 Seimei — Pure and Clear
  { ordinal: 13, sekki: "Seimei", kanji: "玄鳥至", romaji: "Tsubame kitaru", english: "Swallows return", startMonth: 4, startDay: 5, endMonth: 4, endDay: 9 },
  { ordinal: 14, sekki: "Seimei", kanji: "鴻雁北", romaji: "Kōgan kaeru", english: "Wild geese fly north", startMonth: 4, startDay: 10, endMonth: 4, endDay: 14 },
  { ordinal: 15, sekki: "Seimei", kanji: "虹始見", romaji: "Niji hajimete arawaru", english: "First rainbows", startMonth: 4, startDay: 15, endMonth: 4, endDay: 19 },

  // 穀雨 Kokuu — Grain Rain
  { ordinal: 16, sekki: "Kokuu", kanji: "葭始生", romaji: "Ashi hajimete shōzu", english: "Reeds begin to sprout", startMonth: 4, startDay: 20, endMonth: 4, endDay: 24 },
  { ordinal: 17, sekki: "Kokuu", kanji: "霜止出苗", romaji: "Shimo yamite nae izuru", english: "Last frost; rice seedlings grow", startMonth: 4, startDay: 25, endMonth: 4, endDay: 29 },
  { ordinal: 18, sekki: "Kokuu", kanji: "牡丹華", romaji: "Botan hana saku", english: "Peonies bloom", startMonth: 4, startDay: 30, endMonth: 5, endDay: 4 },

  // 立夏 Rikka — Beginning of Summer
  { ordinal: 19, sekki: "Rikka", kanji: "蛙始鳴", romaji: "Kawazu hajimete naku", english: "Frogs start to sing", startMonth: 5, startDay: 5, endMonth: 5, endDay: 9 },
  { ordinal: 20, sekki: "Rikka", kanji: "蚯蚓出", romaji: "Mimizu izuru", english: "Worms surface", startMonth: 5, startDay: 10, endMonth: 5, endDay: 14 },
  { ordinal: 21, sekki: "Rikka", kanji: "竹笋生", romaji: "Takenoko shōzu", english: "Bamboo shoots sprout", startMonth: 5, startDay: 15, endMonth: 5, endDay: 20 },

  // 小満 Shōman — Lesser Ripening
  { ordinal: 22, sekki: "Shōman", kanji: "蚕起食桑", romaji: "Kaiko okite kuwa o hamu", english: "Silkworms wake to eat mulberry", startMonth: 5, startDay: 21, endMonth: 5, endDay: 25 },
  { ordinal: 23, sekki: "Shōman", kanji: "紅花栄", romaji: "Benibana sakau", english: "Safflowers thrive", startMonth: 5, startDay: 26, endMonth: 5, endDay: 30 },
  { ordinal: 24, sekki: "Shōman", kanji: "麦秋至", romaji: "Mugi no toki itaru", english: "Wheat ripens", startMonth: 5, startDay: 31, endMonth: 6, endDay: 5 },

  // 芒種 Bōshu — Grain Beard
  { ordinal: 25, sekki: "Bōshu", kanji: "蟷螂生", romaji: "Kamakiri shōzu", english: "Praying mantises hatch", startMonth: 6, startDay: 6, endMonth: 6, endDay: 10 },
  { ordinal: 26, sekki: "Bōshu", kanji: "腐草為螢", romaji: "Kusaretaru kusa hotaru to naru", english: "Fireflies rise from damp grass", startMonth: 6, startDay: 11, endMonth: 6, endDay: 15 },
  { ordinal: 27, sekki: "Bōshu", kanji: "梅子黄", romaji: "Ume no mi kibamu", english: "Plums turn yellow", startMonth: 6, startDay: 16, endMonth: 6, endDay: 20 },

  // 夏至 Geshi — Summer Solstice
  { ordinal: 28, sekki: "Geshi", kanji: "乃東枯", romaji: "Natsukarekusa karuru", english: "Self-heal withers", startMonth: 6, startDay: 21, endMonth: 6, endDay: 26 },
  { ordinal: 29, sekki: "Geshi", kanji: "菖蒲華", romaji: "Ayame hana saku", english: "Iris bloom", startMonth: 6, startDay: 27, endMonth: 7, endDay: 1 },
  { ordinal: 30, sekki: "Geshi", kanji: "半夏生", romaji: "Hange shōzu", english: "Crow-dipper sprouts", startMonth: 7, startDay: 2, endMonth: 7, endDay: 6 },

  // 小暑 Shōsho — Lesser Heat
  { ordinal: 31, sekki: "Shōsho", kanji: "温風至", romaji: "Atsukaze itaru", english: "Warm winds arrive", startMonth: 7, startDay: 7, endMonth: 7, endDay: 11 },
  { ordinal: 32, sekki: "Shōsho", kanji: "蓮始開", romaji: "Hasu hajimete hiraku", english: "First lotus open", startMonth: 7, startDay: 12, endMonth: 7, endDay: 16 },
  { ordinal: 33, sekki: "Shōsho", kanji: "鷹乃学習", romaji: "Taka sunawachi waza o narau", english: "Young hawks learn to fly", startMonth: 7, startDay: 17, endMonth: 7, endDay: 22 },

  // 大暑 Taisho — Greater Heat
  { ordinal: 34, sekki: "Taisho", kanji: "桐始結花", romaji: "Kiri hajimete hana o musubu", english: "Paulownia trees set seed", startMonth: 7, startDay: 23, endMonth: 7, endDay: 28 },
  { ordinal: 35, sekki: "Taisho", kanji: "土潤溽暑", romaji: "Tsuchi uruōte mushiatsushi", english: "Earth turns damp and humid", startMonth: 7, startDay: 29, endMonth: 8, endDay: 2 },
  { ordinal: 36, sekki: "Taisho", kanji: "大雨時行", romaji: "Taiu tokidoki furu", english: "Great rains fall in spells", startMonth: 8, startDay: 3, endMonth: 8, endDay: 7 },

  // 立秋 Risshū — Beginning of Autumn
  { ordinal: 37, sekki: "Risshū", kanji: "涼風至", romaji: "Suzukaze itaru", english: "Cool winds blow", startMonth: 8, startDay: 8, endMonth: 8, endDay: 12 },
  { ordinal: 38, sekki: "Risshū", kanji: "寒蝉鳴", romaji: "Higurashi naku", english: "Evening cicadas sing", startMonth: 8, startDay: 13, endMonth: 8, endDay: 17 },
  { ordinal: 39, sekki: "Risshū", kanji: "蒙霧升降", romaji: "Fukaki kiri matō", english: "Thick fog descends", startMonth: 8, startDay: 18, endMonth: 8, endDay: 22 },

  // 処暑 Shosho — End of Heat
  { ordinal: 40, sekki: "Shosho", kanji: "綿柎開", romaji: "Wata no hana shibe hiraku", english: "Cotton bolls open", startMonth: 8, startDay: 23, endMonth: 8, endDay: 27 },
  { ordinal: 41, sekki: "Shosho", kanji: "天地始粛", romaji: "Tenchi hajimete samushi", english: "Heat starts to soften", startMonth: 8, startDay: 28, endMonth: 9, endDay: 1 },
  { ordinal: 42, sekki: "Shosho", kanji: "禾乃登", romaji: "Kokumono sunawachi minoru", english: "Rice ripens", startMonth: 9, startDay: 2, endMonth: 9, endDay: 7 },

  // 白露 Hakuro — White Dew
  { ordinal: 43, sekki: "Hakuro", kanji: "草露白", romaji: "Kusa no tsuyu shiroshi", english: "Dew glistens white on grass", startMonth: 9, startDay: 8, endMonth: 9, endDay: 12 },
  { ordinal: 44, sekki: "Hakuro", kanji: "鶺鴒鳴", romaji: "Sekirei naku", english: "Wagtails sing", startMonth: 9, startDay: 13, endMonth: 9, endDay: 17 },
  { ordinal: 45, sekki: "Hakuro", kanji: "玄鳥去", romaji: "Tsubame saru", english: "Swallows leave", startMonth: 9, startDay: 18, endMonth: 9, endDay: 22 },

  // 秋分 Shūbun — Autumn Equinox
  { ordinal: 46, sekki: "Shūbun", kanji: "雷乃収声", romaji: "Kaminari sunawachi koe o osamu", english: "Thunder ceases", startMonth: 9, startDay: 23, endMonth: 9, endDay: 27 },
  { ordinal: 47, sekki: "Shūbun", kanji: "蟄虫坏戸", romaji: "Mushi kakurete to o fusagu", english: "Insects close their burrows", startMonth: 9, startDay: 28, endMonth: 10, endDay: 2 },
  { ordinal: 48, sekki: "Shūbun", kanji: "水始涸", romaji: "Mizu hajimete karuru", english: "Farmers drain rice paddies", startMonth: 10, startDay: 3, endMonth: 10, endDay: 7 },

  // 寒露 Kanro — Cold Dew
  { ordinal: 49, sekki: "Kanro", kanji: "鴻雁来", romaji: "Kōgan kitaru", english: "Wild geese return", startMonth: 10, startDay: 8, endMonth: 10, endDay: 12 },
  { ordinal: 50, sekki: "Kanro", kanji: "菊花開", romaji: "Kiku no hana hiraku", english: "Chrysanthemums bloom", startMonth: 10, startDay: 13, endMonth: 10, endDay: 17 },
  { ordinal: 51, sekki: "Kanro", kanji: "蟋蟀在戸", romaji: "Kirigirisu to ni ari", english: "Crickets chirp at the door", startMonth: 10, startDay: 18, endMonth: 10, endDay: 22 },

  // 霜降 Sōkō — Frost Falls
  { ordinal: 52, sekki: "Sōkō", kanji: "霜始降", romaji: "Shimo hajimete furu", english: "First frost", startMonth: 10, startDay: 23, endMonth: 10, endDay: 27 },
  { ordinal: 53, sekki: "Sōkō", kanji: "霎時施", romaji: "Kosame tokidoki furu", english: "Light rains fall in spells", startMonth: 10, startDay: 28, endMonth: 11, endDay: 1 },
  { ordinal: 54, sekki: "Sōkō", kanji: "楓蔦黄", romaji: "Momiji tsuta kibamu", english: "Maples and ivies turn yellow", startMonth: 11, startDay: 2, endMonth: 11, endDay: 6 },

  // 立冬 Rittō — Beginning of Winter
  { ordinal: 55, sekki: "Rittō", kanji: "山茶始開", romaji: "Tsubaki hajimete hiraku", english: "First camellias bloom", startMonth: 11, startDay: 7, endMonth: 11, endDay: 11 },
  { ordinal: 56, sekki: "Rittō", kanji: "地始凍", romaji: "Chi hajimete kōru", english: "Earth begins to freeze", startMonth: 11, startDay: 12, endMonth: 11, endDay: 16 },
  { ordinal: 57, sekki: "Rittō", kanji: "金盞香", romaji: "Kinsenka saku", english: "Daffodils bloom", startMonth: 11, startDay: 17, endMonth: 11, endDay: 21 },

  // 小雪 Shōsetsu — Lesser Snow
  { ordinal: 58, sekki: "Shōsetsu", kanji: "虹蔵不見", romaji: "Niji kakurete miezu", english: "Rainbows hide", startMonth: 11, startDay: 22, endMonth: 11, endDay: 26 },
  { ordinal: 59, sekki: "Shōsetsu", kanji: "朔風払葉", romaji: "Kitakaze konoha o harau", english: "North wind sweeps leaves", startMonth: 11, startDay: 27, endMonth: 12, endDay: 1 },
  { ordinal: 60, sekki: "Shōsetsu", kanji: "橘始黄", romaji: "Tachibana hajimete kibamu", english: "Tachibana citrus turns yellow", startMonth: 12, startDay: 2, endMonth: 12, endDay: 6 },

  // 大雪 Taisetsu — Greater Snow
  { ordinal: 61, sekki: "Taisetsu", kanji: "閉塞成冬", romaji: "Sora samuku fuyu to naru", english: "Sky overcasts; full winter", startMonth: 12, startDay: 7, endMonth: 12, endDay: 11 },
  { ordinal: 62, sekki: "Taisetsu", kanji: "熊蟄穴", romaji: "Kuma ana ni komoru", english: "Bears hibernate", startMonth: 12, startDay: 12, endMonth: 12, endDay: 16 },
  { ordinal: 63, sekki: "Taisetsu", kanji: "鱖魚群", romaji: "Sake no uo muragaru", english: "Salmon gather and run upstream", startMonth: 12, startDay: 17, endMonth: 12, endDay: 21 },

  // 冬至 Tōji — Winter Solstice
  { ordinal: 64, sekki: "Tōji", kanji: "乃東生", romaji: "Natsukarekusa shōzu", english: "Self-heal sprouts", startMonth: 12, startDay: 22, endMonth: 12, endDay: 26 },
  { ordinal: 65, sekki: "Tōji", kanji: "麋角解", romaji: "Sawashika no tsuno otsuru", english: "Deer shed their antlers", startMonth: 12, startDay: 27, endMonth: 12, endDay: 31 },
  { ordinal: 66, sekki: "Tōji", kanji: "雪下出麦", romaji: "Yuki watarite mugi nobiru", english: "Wheat sprouts under the snow", startMonth: 1, startDay: 1, endMonth: 1, endDay: 5 },

  // 小寒 Shōkan — Lesser Cold
  { ordinal: 67, sekki: "Shōkan", kanji: "芹乃栄", romaji: "Seri sunawachi sakau", english: "Parsley flourishes", startMonth: 1, startDay: 6, endMonth: 1, endDay: 10 },
  { ordinal: 68, sekki: "Shōkan", kanji: "水泉動", romaji: "Shimizu atataka o fukumu", english: "Spring water stirs", startMonth: 1, startDay: 11, endMonth: 1, endDay: 15 },
  { ordinal: 69, sekki: "Shōkan", kanji: "雉始雊", romaji: "Kiji hajimete naku", english: "Pheasants begin to call", startMonth: 1, startDay: 16, endMonth: 1, endDay: 20 },

  // 大寒 Daikan — Greater Cold
  { ordinal: 70, sekki: "Daikan", kanji: "款冬華", romaji: "Fuki no hana saku", english: "Butterbur flowers bloom", startMonth: 1, startDay: 21, endMonth: 1, endDay: 25 },
  { ordinal: 71, sekki: "Daikan", kanji: "水沢腹堅", romaji: "Sawamizu kōri tsumeru", english: "Mountain streams freeze solid", startMonth: 1, startDay: 26, endMonth: 1, endDay: 30 },
  { ordinal: 72, sekki: "Daikan", kanji: "鶏始乳", romaji: "Niwatori hajimete toya ni tsuku", english: "Hens start laying eggs", startMonth: 1, startDay: 31, endMonth: 2, endDay: 3 },
];

function isDateInRange(month: number, day: number, m: Microseason): boolean {
  const current = month * 100 + day;
  const start = m.startMonth * 100 + m.startDay;
  const end = m.endMonth * 100 + m.endDay;
  // Microseasons never wrap year-end inside a single entry — kō #66
  // (Jan 1-5) is the calendar reset point. So a simple range check works.
  return current >= start && current <= end;
}

/** Returns the active microseason for the given date (defaults to today). */
export function getActiveMicroseason(date: Date = new Date()): Microseason | null {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  for (const m of MICROSEASONS) {
    if (isDateInRange(month, day, m)) return m;
  }
  return null;
}
