import { en } from "./dictionaries/en";
import { ja } from "./dictionaries/ja";
import { locales, type Locale } from "./config";
import type { Dictionary } from "./types";

const dictionaries: Record<Locale, Dictionary> = {
  ja,
  en
};

export function getDictionary(locale: Locale): Promise<Dictionary> {
  if (!locales.includes(locale)) {
    return Promise.reject(new Error(`Unsupported locale: ${locale}`));
  }

  return Promise.resolve(dictionaries[locale]);
}
