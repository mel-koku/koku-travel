import { typography } from "@/lib/typography-system";

type Phrase = {
  romaji: string;
  japanese: string;
  english: string;
};

type PhraseGroup = {
  title: string;
  phrases: Phrase[];
};

const PHRASE_GROUPS: PhraseGroup[] = [
  {
    title: "Essentials",
    phrases: [
      { romaji: "Arigatou gozaimasu", japanese: "ありがとうございます", english: "Thank you" },
      { romaji: "Sumimasen", japanese: "すみません", english: "Excuse me / I'm sorry" },
      { romaji: "Onegaishimasu", japanese: "おねがいします", english: "Please" },
      { romaji: "Daijoubu desu", japanese: "大丈夫です", english: "I'm fine / No thank you" },
    ],
  },
  {
    title: "Getting around",
    phrases: [
      { romaji: "...wa doko desu ka?", japanese: "…はどこですか？", english: "Where is...?" },
      { romaji: "Eki wa doko desu ka?", japanese: "駅はどこですか？", english: "Where is the station?" },
      { romaji: "Koko wa doko desu ka?", japanese: "ここはどこですか？", english: "Where am I?" },
      { romaji: "Hidari / Migi / Massugu", japanese: "左 / 右 / まっすぐ", english: "Left / Right / Straight" },
    ],
  },
  {
    title: "Eating",
    phrases: [
      { romaji: "Itadakimasu", japanese: "いただきます", english: "Said before eating" },
      { romaji: "Gochisousama deshita", japanese: "ごちそうさまでした", english: "Said after eating" },
      { romaji: "Okaikei onegaishimasu", japanese: "お会計おねがいします", english: "Check, please" },
      { romaji: "Kore o kudasai", japanese: "これをください", english: "This one, please" },
      { romaji: "Oishii desu", japanese: "おいしいです", english: "It's delicious" },
    ],
  },
  {
    title: "Shopping",
    phrases: [
      { romaji: "Ikura desu ka?", japanese: "いくらですか？", english: "How much?" },
      { romaji: "Mite mo ii desu ka?", japanese: "見てもいいですか？", english: "May I look?" },
    ],
  },
  {
    title: "Emergencies",
    phrases: [
      { romaji: "Tasukete kudasai", japanese: "助けてください", english: "Please help" },
      { romaji: "Byouin wa doko desu ka?", japanese: "病院はどこですか？", english: "Where is the hospital?" },
      { romaji: "Keisatsu o yonde kudasai", japanese: "警察を呼んでください", english: "Please call the police" },
    ],
  },
];

export function PrintPhrases() {
  return (
    <article className="print-page">
      <div className="print-page-inner">
        <header className="mb-10">
          <p className="eyebrow-mono mb-3">Language</p>
          <h2 className={typography({ intent: "editorial-h1" })}>
            Essential phrases
          </h2>
        </header>

        <div className="flex-1 space-y-6">
          {PHRASE_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="font-serif text-[11pt] font-semibold leading-tight text-foreground mb-2">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.phrases.map((phrase) => (
                  <div key={phrase.romaji} className="print-avoid-break flex items-baseline gap-2">
                    <span className="font-sans text-[9pt] font-medium text-foreground w-[42mm] shrink-0">
                      {phrase.romaji}
                    </span>
                    <span className="font-sans text-[9pt] text-foreground-secondary w-[30mm] shrink-0">
                      {phrase.japanese}
                    </span>
                    <span className="font-sans text-[8pt] text-stone">
                      {phrase.english}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="print-folio">Phrases</div>
    </article>
  );
}
