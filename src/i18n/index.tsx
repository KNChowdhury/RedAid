import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// English/Bangla UI. Strings live next to the component that uses them:
//
//   const S = defineStrings(
//     { title: 'Donors', match: '{count} donors match' },
//     { title: 'ডোনার',  match: '{count} জন ডোনার মিলেছে' }
//   );
//   const { s, f } = useStrings(S);   // s.title, f(s.match, { count: 25 })
//
// defineStrings makes the Bangla object require every English key, so a
// missing translation is a type error, not a silent English leftover.
// Data from the database (names, districts, hospitals) and blood groups are
// shown as stored, in both languages.

export type Lang = 'en' | 'bn';
const STORAGE_KEY = 'lang';

type Table<T extends Record<string, string>> = { en: T; bn: { [K in keyof T]: string } };

export function defineStrings<T extends Record<string, string>>(en: T, bn: { [K in keyof T]: string }): Table<T> {
  return { en, bn };
}

export function formatNumber(value: number, lang: Lang): string {
  return value.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US');
}

/**
 * A stored 'YYYY-MM-DD' date for display: unchanged in English (what the UI
 * always showed), "২১ আগস্ট, ২০২৬" in Bangla. Formatted in UTC because the
 * string has no time zone; local formatting could shift it by a day.
 */
export function formatDate(isoDate: string, lang: Lang): string {
  if (lang === 'en' || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('bn-BD', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

/** Replaces {name} placeholders; numbers are written in that language's digits. */
export function fmt(template: string, values: Record<string, string | number>, lang: Lang): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    if (value === undefined) return match;
    return typeof value === 'number' ? formatNumber(value, lang) : value;
  });
}

/**
 * Like fmt(), but placeholders become React nodes (an icon, a bold name), in
 * whatever position each language's word order puts them.
 */
export function richText(template: string, pieces: Record<string, React.ReactNode>): React.ReactNode[] {
  return template.split(/(\{\w+\})/g).map((part, i) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1];
    return <React.Fragment key={i}>{key && key in pieces ? pieces[key] : part}</React.Fragment>;
  });
}

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'bn') return saved;
  } catch {
    // storage blocked: fall through to the browser language
  }
  return typeof navigator !== 'undefined' && /^bn\b/i.test(navigator.language) ? 'bn' : 'en';
}

interface LangValue {
  lang: Lang;
  toggleLang: () => void;
}

const LangContext = createContext<LangValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // storage blocked: the choice lasts for this visit only
    }
  }, [lang]);

  const toggleLang = useCallback(() => setLang(prev => (prev === 'en' ? 'bn' : 'en')), []);
  const value = useMemo(() => ({ lang, toggleLang }), [lang, toggleLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
};

export function useLang(): LangValue {
  const value = useContext(LangContext);
  if (!value) throw new Error('useLang must be used inside <LanguageProvider>');
  return value;
}

/** Active-language strings from a defineStrings() table, plus a formatter bound to that language. */
export function useStrings<T extends Record<string, string>>(table: Table<T>) {
  const { lang } = useLang();
  const s = table[lang] as { [K in keyof T]: string };
  const f = useCallback((template: string, values: Record<string, string | number>) => fmt(template, values, lang), [lang]);
  return { s, f, lang };
}
