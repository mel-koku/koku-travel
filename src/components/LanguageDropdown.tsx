'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/lib/i18n/navigation';  // ← Navigation helpers from next-intl
import { languageConfig, locales, type Locale } from '@/lib/i18n/config';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export default function LanguageDropdown() {
  const locale = useLocale() as Locale;
  const rawPathname = usePathname(); // ← Returns path WITHOUT locale (e.g., /explore)
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = languageConfig[locale];

  // Normalize pathname: ensure it doesn't contain any locale prefix
  // This prevents /jp/jp issues if usePathname() accidentally includes locale
  const pathname = (() => {
    let normalized = rawPathname;
    
    // Check if pathname starts with any locale and strip it
    for (const loc of locales) {
      if (normalized.startsWith(`/${loc}/`) || normalized === `/${loc}`) {
        normalized = normalized.slice(`/${loc}`.length) || '/';
        break;
      }
    }
    
    return normalized;
  })();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);


  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Select language"
        aria-expanded={open}
      >
        <span className="text-lg">{currentLang.flag}</span>
        <span className="font-medium text-sm">{currentLang.code.toUpperCase()}</span>
        <ChevronDown className={cn(
          "w-4 h-4 transition-transform",
          open && "rotate-180"
        )} />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {locales.map((lang) => {
            const langConfig = languageConfig[lang];
            const isActive = locale === lang;

            return (
              <Link
                key={lang}
                href={pathname}  // ← pathname already WITHOUT locale from next-intl
                locale={lang}    // ← Link automatically adds locale prefix
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer",
                  isActive && "bg-blue-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{langConfig.flag}</span>
                  <span className="font-medium text-sm">{langConfig.nativeName}</span>
                </div>
                {isActive && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
