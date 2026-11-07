import { describe, expect, it } from "vitest";
import { LOCALES, getDict, languageLabel, negotiate, translateField, nativeFrenchName } from "@/i18n";
import { fr } from "@/i18n/fr";
import { HOBBIES, JOBS, LANGUAGES, SCENES, TRAITS } from "@/lib/characters";

function shape(v: unknown): unknown {
  if (Array.isArray(v)) return v.length;
  if (typeof v === "function") return "fn";
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)]));
  return typeof v;
}

describe("langues du site", () => {
  it("propose au moins 6 langues", () => {
    expect(LOCALES.map((l) => l.code)).toEqual(expect.arrayContaining(["fr", "en", "es", "pt", "ar", "de"]));
  });
  it("chaque dictionnaire a exactement la même forme que le français", () => {
    for (const { code } of LOCALES) expect(shape(getDict(code))).toEqual(shape(fr));
  });
  it("les listes traduites suivent l'ordre des listes du personnage", () => {
    expect(fr.data.jobs.length).toBe(JOBS.length);
    expect(fr.data.traits.length).toBe(TRAITS.length);
    expect(fr.data.hobbies.length).toBe(HOBBIES.length);
    expect(fr.data.scenes.length).toBe(SCENES.length);
    expect(translateField(getDict("en"), "jobs", "barista")).toBe("barista");
    expect(translateField(getDict("es"), "hobbies", "le football")).toBe("el fútbol");
  });
  it("choisit la langue du navigateur", () => {
    expect(negotiate("es-ES,es;q=0.9,en;q=0.8")).toBe("es");
    expect(negotiate("ja-JP,ja")).toBe("fr");
    expect(negotiate("ar-MA,fr;q=0.8")).toBe("ar");
  });
  it("traduit le nom des langues apprises", () => {
    const kab = LANGUAGES.find((l) => l.code === "kab")!;
    expect(languageLabel(kab, "fr")).toBe("Kabyle");
    expect(languageLabel(kab, "en")).toBe("Kabyle");
    const ja = LANGUAGES.find((l) => l.code === "ja")!;
    expect(languageLabel(ja, "es")).toBe("Japonés");
    expect(languageLabel(ja, "de")).toBe("Japanisch");
    expect(nativeFrenchName("en")).toBe("anglais");
  });
});
