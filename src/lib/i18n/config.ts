export const locales = ['en', 'jp', 'ko', 'zh'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const languageConfig = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
  },
  jp: {
    code: 'jp',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
  },
  ko: {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    flag: '🇰🇷',
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
  },
} as const;

// Helper functions for LanguageDropdown compatibility
export type LanguageConfig = {
  code: Locale;
  name: string;
  nativeName: string;
  flag: string;
};

export function getLanguageByCode(code: Locale): LanguageConfig | undefined {
  return languageConfig[code];
}

export function getAllLanguages(): LanguageConfig[] {
  return locales.map((locale) => languageConfig[locale]);
}
