import type { PhraseCategory, PocketPhrase } from "@/types/pocketPhrase";

/**
 * ~60 curated pocket phrases across 10 categories.
 * Phrases to SAY at locations — separate concept from tips (things to KNOW).
 */
export const POCKET_PHRASES: Record<PhraseCategory, PocketPhrase[]> = {
  shrine: [
    { japanese: "二拝二拍手一拝", romaji: "Nihai nihakushu ichihai", english: "Two bows, two claps, one bow", context: "The prayer ritual" },
    { japanese: "お守りをください", romaji: "Omamori o kudasai", english: "A charm, please", context: "At the charm counter" },
    { japanese: "御朱印をお願いします", romaji: "Goshuin o onegai shimasu", english: "May I have a seal stamp?", context: "At the stamp office" },
    { japanese: "おみくじをひとつ", romaji: "Omikuji o hitotsu", english: "One fortune slip, please" },
    { japanese: "写真を撮ってもいいですか", romaji: "Shashin o totte mo ii desu ka", english: "May I take a photo?" },
    { japanese: "手水はどこですか", romaji: "Temizu wa doko desu ka", english: "Where is the purification fountain?" },
  ],
  temple: [
    { japanese: "拝観料はいくらですか", romaji: "Haikanryō wa ikura desu ka", english: "How much is the entrance fee?" },
    { japanese: "靴を脱ぎますか", romaji: "Kutsu o nugimasu ka", english: "Should I take off my shoes?", context: "Before entering halls" },
    { japanese: "写真は大丈夫ですか", romaji: "Shashin wa daijōbu desu ka", english: "Is it okay to take photos?" },
    { japanese: "お線香をください", romaji: "Osenkō o kudasai", english: "Incense, please", context: "At the incense stand" },
    { japanese: "庭園はどちらですか", romaji: "Teien wa dochira desu ka", english: "Which way to the garden?" },
    { japanese: "座禅体験はありますか", romaji: "Zazen taiken wa arimasu ka", english: "Do you have a Zen meditation experience?" },
  ],
  restaurant: [
    { japanese: "いただきます", romaji: "Itadakimasu", english: "Thanks for the meal", context: "Before eating" },
    { japanese: "ごちそうさまでした", romaji: "Gochisōsama deshita", english: "That was delicious", context: "After eating" },
    { japanese: "すみません、注文お願いします", romaji: "Sumimasen, chūmon onegai shimasu", english: "Excuse me, I'd like to order" },
    { japanese: "おすすめは何ですか", romaji: "Osusume wa nan desu ka", english: "What do you recommend?" },
    { japanese: "お会計お願いします", romaji: "Okaikei onegai shimasu", english: "Check, please" },
    { japanese: "アレルギーがあります", romaji: "Arerugī ga arimasu", english: "I have allergies", context: "When ordering" },
    { japanese: "一人です", romaji: "Hitori desu", english: "Just one person", context: "When entering" },
  ],
  cafe: [
    { japanese: "ホットコーヒーをください", romaji: "Hotto kōhī o kudasai", english: "Hot coffee, please" },
    { japanese: "テイクアウトでお願いします", romaji: "Teikuauto de onegai shimasu", english: "To go, please" },
    { japanese: "店内でお願いします", romaji: "Tennai de onegai shimasu", english: "For here, please" },
    { japanese: "Wi-Fiはありますか", romaji: "Waifai wa arimasu ka", english: "Is there Wi-Fi?" },
    { japanese: "抹茶ラテをください", romaji: "Matcha rate o kudasai", english: "Matcha latte, please" },
    { japanese: "コンセントはありますか", romaji: "Konsento wa arimasu ka", english: "Is there a power outlet?" },
  ],
  bar: [
    { japanese: "生ビールをください", romaji: "Nama bīru o kudasai", english: "A draft beer, please" },
    { japanese: "おすすめのお酒はありますか", romaji: "Osusume no osake wa arimasu ka", english: "Any recommended drinks?" },
    { japanese: "乾杯！", romaji: "Kanpai!", english: "Cheers!" },
    { japanese: "もう一杯お願いします", romaji: "Mō ippai onegai shimasu", english: "One more, please" },
    { japanese: "日本酒はありますか", romaji: "Nihonshu wa arimasu ka", english: "Do you have sake?" },
    { japanese: "お通しは何ですか", romaji: "Otōshi wa nan desu ka", english: "What's the table charge appetizer?" },
  ],
  onsen: [
    { japanese: "タオルはありますか", romaji: "Taoru wa arimasu ka", english: "Are towels available?" },
    { japanese: "貸切風呂はありますか", romaji: "Kashikiri buro wa arimasu ka", english: "Do you have private baths?" },
    { japanese: "入浴料はいくらですか", romaji: "Nyūyokuryō wa ikura desu ka", english: "How much is the bathing fee?" },
    { japanese: "ロッカーはどこですか", romaji: "Rokkā wa doko desu ka", english: "Where are the lockers?" },
    { japanese: "露天風呂はありますか", romaji: "Rotenburo wa arimasu ka", english: "Is there an outdoor bath?" },
    { japanese: "刺青は大丈夫ですか", romaji: "Irezumi wa daijōbu desu ka", english: "Are tattoos okay?" },
  ],
  shopping: [
    { japanese: "これをください", romaji: "Kore o kudasai", english: "This one, please" },
    { japanese: "試着してもいいですか", romaji: "Shichaku shite mo ii desu ka", english: "May I try this on?" },
    { japanese: "免税はできますか", romaji: "Menzei wa dekimasu ka", english: "Is tax-free available?", context: "For purchases over ¥5,000" },
    { japanese: "クレジットカードは使えますか", romaji: "Kurejitto kādo wa tsukaemasu ka", english: "Can I pay by credit card?" },
    { japanese: "他の色はありますか", romaji: "Hoka no iro wa arimasu ka", english: "Do you have other colors?" },
    { japanese: "プレゼント用に包んでください", romaji: "Purezento yō ni tsutsunde kudasai", english: "Please gift-wrap this" },
  ],
  station: [
    { japanese: "すみません、○○駅はどこですか", romaji: "Sumimasen, ○○ eki wa doko desu ka", english: "Excuse me, where is ○○ station?" },
    { japanese: "次の電車は何時ですか", romaji: "Tsugi no densha wa nanji desu ka", english: "When is the next train?" },
    { japanese: "○○行きはどのホームですか", romaji: "○○ yuki wa dono hōmu desu ka", english: "Which platform for ○○?" },
    { japanese: "乗り換えはどこですか", romaji: "Norikae wa doko desu ka", english: "Where do I transfer?" },
    { japanese: "ICカードにチャージしたいです", romaji: "IC kādo ni chāji shitai desu", english: "I'd like to top up my IC card" },
  ],
  hotel: [
    { japanese: "チェックインお願いします", romaji: "Chekkuin onegai shimasu", english: "Check-in, please" },
    { japanese: "荷物を預かってもらえますか", romaji: "Nimotsu o azukatte moraemasu ka", english: "Can you hold my luggage?" },
    { japanese: "チェックアウトは何時ですか", romaji: "Chekkuauto wa nanji desu ka", english: "What time is checkout?" },
    { japanese: "Wi-Fiのパスワードは何ですか", romaji: "Waifai no pasuwādo wa nan desu ka", english: "What's the Wi-Fi password?" },
    { japanese: "タクシーを呼んでもらえますか", romaji: "Takushī o yonde moraemasu ka", english: "Could you call a taxi?" },
  ],
  general: [
    { japanese: "ありがとうございます", romaji: "Arigatō gozaimasu", english: "Thank you very much" },
    { japanese: "すみません", romaji: "Sumimasen", english: "Excuse me / Sorry" },
    { japanese: "トイレはどこですか", romaji: "Toire wa doko desu ka", english: "Where is the restroom?" },
    { japanese: "英語のメニューはありますか", romaji: "Eigo no menyū wa arimasu ka", english: "Do you have an English menu?" },
    { japanese: "お願いします", romaji: "Onegai shimasu", english: "Please" },
    { japanese: "大丈夫です", romaji: "Daijōbu desu", english: "It's fine / No thanks" },
  ],
};
