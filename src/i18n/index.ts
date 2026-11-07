import { fr, type Dict } from "./fr";
import { en } from "./en";
import { es } from "./es";
import { pt } from "./pt";
import { ar } from "./ar";
import { de } from "./de";
import { JOBS, TRAITS, HOBBIES, languageByCode, type Language } from "@/lib/characters";

export type { Dict };
export const LOCALES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "ar", label: "العربية" },
  { code: "de", label: "Deutsch" },
] as const;
export type Locale = (typeof LOCALES)[number]["code"];
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "locale";

const DICTS: Record<Locale, Dict> = { fr, en, es, pt, ar, de };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && LOCALES.some((l) => l.code === v);
}
export function getDict(locale: Locale): Dict {
  return DICTS[locale] ?? fr;
}
export const isRtl = (locale: Locale) => locale === "ar";

/** Choisit la langue d'après l'en-tête Accept-Language du navigateur. */
export function negotiate(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  for (const part of acceptLanguage.split(",")) {
    const base = part.split(";")[0].trim().toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

const displayCache = new Map<string, Intl.DisplayNames | null>();
function names(locale: Locale): Intl.DisplayNames | null {
  if (!displayCache.has(locale)) {
    try { displayCache.set(locale, new Intl.DisplayNames([locale], { type: "language" })); } catch { displayCache.set(locale, null); }
  }
  return displayCache.get(locale)!;
}

/** Nom d'une langue de la liste dans la langue du site (repli : nom français). */
export function languageLabel(lang: Language, locale: Locale): string {
  if (locale === "fr" || lang.code.includes("-") && !/^[a-z]{2,3}-[A-Z]{2}$/.test(lang.code)) return lang.fr;
  try {
    const n = names(locale)?.of(lang.code);
    if (n && n.toLowerCase() !== lang.code.toLowerCase()) return n.charAt(0).toLocaleUpperCase(locale) + n.slice(1);
  } catch {}
  return lang.fr;
}

/** Nom affiché d'une langue enregistrée (code de la liste ou saisie libre). */
export function storedLanguageLabel(code: string, storedName: string, locale: Locale): string {
  const l = languageByCode(code);
  return l ? languageLabel(l, locale) : storedName;
}

/** Traduit une valeur de personnage (métier, trait, loisir) enregistrée en français. */
export function translateField(d: Dict, kind: "jobs" | "traits" | "hobbies", value: string): string {
  const src = kind === "jobs" ? JOBS : kind === "traits" ? TRAITS : HOBBIES;
  const i = src.indexOf(value);
  return i >= 0 ? d.data[kind][i] : value;
}

/** Langue de l'élève : codes proposés, et leur nom en français pour la consigne donnée à Claude. */
export { NATIVE_CODES } from "@/lib/characters";
export function nativeLabel(code: string, locale: Locale): string {
  try {
    const n = names(locale)?.of(code);
    if (n && n !== code) return n.charAt(0).toLocaleUpperCase(locale) + n.slice(1);
  } catch {}
  return code;
}
export function nativeFrenchName(code: string): string {
  return nativeLabel(code, "fr").toLowerCase();
}
