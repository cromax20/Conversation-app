import { describe, expect, it } from "vitest";
import {
  CUSTOM, LANGUAGES, REGIONS, buildSystemPrompt, conversationTitle, isValidSetup, languageName, progressKey, randomCharacter,
  type ConversationSetup,
} from "@/lib/characters";

const base: ConversationSetup = {
  language: "es", level: "A2", nativeLang: "français", sceneIndex: 1, context: "",
  character: { name: "Lucía", age: 31, city: "Madrid", job: "barista", trait: "calme et très patient·e", hobby: "le football" },
};

describe("langues", () => {
  it("propose plus de 100 langues et dialectes, avec des codes uniques", () => {
    expect(LANGUAGES.length).toBeGreaterThan(100);
    const codes = LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
  it("range chaque langue dans une région connue, avec des prénoms et des villes", () => {
    for (const l of LANGUAGES) {
      expect(REGIONS).toContain(l.region);
      expect(l.names.length).toBeGreaterThanOrEqual(4);
      expect(l.cities.length).toBeGreaterThanOrEqual(3);
    }
  });
  it("inclut des dialectes comme le kabyle, la darija et le créole haïtien", () => {
    for (const fr of ["Kabyle", "Arabe marocain (darija)", "Créole haïtien", "Alsacien", "Cantonais"]) {
      expect(LANGUAGES.some((l) => l.fr === fr)).toBe(true);
    }
  });
});

describe("réglages et consigne", () => {
  it("accepte un personnage tiré au hasard", () => {
    const lang = LANGUAGES.find((l) => l.code === "ja")!;
    expect(isValidSetup({ ...base, language: "ja", character: randomCharacter(lang) })).toBe(true);
  });
  it("refuse une langue inconnue, un métier inventé ou un âge hors limites", () => {
    expect(isValidSetup({ ...base, language: "xx" })).toBe(false);
    expect(isValidSetup({ ...base, character: { ...base.character, job: "pirate" } })).toBe(false);
    expect(isValidSetup({ ...base, character: { ...base.character, age: 8 } })).toBe(false);
  });
  it("gère une langue libre avec prénom choisi par le personnage", () => {
    const setup: ConversationSetup = { ...base, language: CUSTOM, customLanguage: "Kabyle de Béjaïa", character: { ...base.character, name: "", city: "" } };
    expect(isValidSetup(setup)).toBe(true);
    expect(isValidSetup({ ...setup, customLanguage: " " })).toBe(false);
    const prompt = buildSystemPrompt(setup);
    expect(prompt).toContain("Tu parles uniquement Kabyle de Béjaïa");
    expect(prompt).toContain("choisis toi-même le prénom");
    expect(prompt).toContain("présente-toi avec ton prénom");
    expect(languageName(setup)).toBe("Kabyle de Béjaïa");
    expect(progressKey(setup)).toBe("custom:kabyle de bejaia");
    expect(conversationTitle(setup)).toContain("Votre interlocuteur·rice");
  });
  it("garde les règles de l'artifact d'origine", () => {
    const prompt = buildSystemPrompt(base);
    expect(prompt).toContain("Tu es Lucía, 31 ans, barista à Madrid.");
    expect(prompt).toContain("Tu parles uniquement espagnol (Español). Niveau A2 :");
    expect(prompt).toContain("Contexte : au café — l'élève commande une boisson");
    expect(prompt).toContain('Si l\'élève écrit "stop"');
  });
  it("utilise la situation libre quand elle est remplie", () => {
    expect(buildSystemPrompt({ ...base, context: "appeler mon propriétaire" })).toContain("Contexte : appeler mon propriétaire.");
  });
});
