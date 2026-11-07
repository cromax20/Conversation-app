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
  it("discussion libre : pas de scénario ni de question imposée à chaque réplique", () => {
    const prompt = buildSystemPrompt({ ...base, sceneIndex: null, freeTalk: true });
    expect(prompt).toContain("discussion libre et naturelle");
    expect(prompt).toContain("sans poser une question à chaque fois");
    expect(prompt).not.toContain("Contexte :");
    expect(prompt).not.toContain("Termine chaque réponse par une question");
  });
  it("utilise la situation libre quand elle est remplie", () => {
    expect(buildSystemPrompt({ ...base, context: "appeler mon propriétaire" })).toContain("Contexte : appeler mon propriétaire.");
  });
});

import { splitExpression, buildCallPrompt } from "@/lib/characters";
import { canCall, freeCallUnlocked } from "@/lib/calls";
import { buildPath } from "@/lib/path";
import { themeFor } from "@/lib/themes";
import { parseAvatar, DEFAULT_AVATAR } from "@/lib/avatar";

describe("appel vidéo", () => {
  it("sépare la balise d'expression de la réplique", () => {
    expect(splitExpression("[sourire] ¡Hola!")).toEqual({ expression: "sourire", text: "¡Hola!" });
    expect(splitExpression("  [RIRE]  Ja ja")).toEqual({ expression: "rire", text: "Ja ja" });
    expect(splitExpression("[inconnu] Hola")).toEqual({ expression: null, text: "Hola" });
    expect(splitExpression("Sin etiqueta")).toEqual({ expression: null, text: "Sin etiqueta" });
  });
  it("demande les balises d'expression et des répliques parlées", () => {
    const p = buildCallPrompt({ language: "es", level: "B2", nativeLang: "français", name: "Lucía", age: 30, place: "Séville", topic: "la feria" });
    expect(p).toContain("appel vidéo");
    expect(p).toContain("[sourire]");
    expect(p).toContain("la feria");
    expect(p).toContain("sans transcription phonétique");
  });
  it("débloque l'appel gratuit seulement au niveau B2 validé par une épreuve, ou avec l'abonnement", () => {
    expect(freeCallUnlocked({ level: "B1", examsPassed: 2 })).toBe(false);
    expect(freeCallUnlocked({ level: "B2", examsPassed: 0 })).toBe(false); // niveau seulement déclaré
    expect(freeCallUnlocked({ level: "B2", examsPassed: 1 })).toBe(true);
    expect(freeCallUnlocked({ level: "C1", examsPassed: 1 })).toBe(true);
    const free = { subscriptionStatus: null, currentPeriodEnd: null };
    const pro = { subscriptionStatus: "active", currentPeriodEnd: null };
    expect(canCall(free, { level: "A1", examsPassed: 0 })).toBe(false);
    expect(canCall(pro, { level: "A1", examsPassed: 0 })).toBe(true);
  });
  it("valide l'apparence envoyée par le navigateur", () => {
    expect(parseAvatar(DEFAULT_AVATAR)).toEqual(DEFAULT_AVATAR);
    expect(parseAvatar({ ...DEFAULT_AVATAR, skin: 99 })).toBeNull();
    expect(parseAvatar({ ...DEFAULT_AVATAR, voice: "robot" })).toBeNull();
  });
});

describe("parcours", () => {
  it("place l'appel vidéo après l'épreuve qui mène au niveau B2", () => {
    const nodes = buildPath({ level: "A2", startLevel: "A1", xp: 160 }, themeFor("es").landmarks, "B2", false);
    const kinds = nodes.map((n) => (n.kind === "tier" ? `${n.level}.${n.tier}` : n.kind === "exam" ? `exam>${n.target}` : n.kind));
    expect(kinds.slice(0, 5)).toEqual(["A1.1", "A1.2", "A1.3", "exam>A2", "A2.1"]);
    expect(kinds[kinds.indexOf("exam>B2") + 1]).toBe("call");
    expect(kinds.at(-1)).toBe("trophy");
    const a2 = nodes.filter((n) => n.kind === "tier" && n.level === "A2").map((n) => n.state);
    expect(a2).toEqual(["done", "current", "locked"]);
    expect(nodes.find((n) => n.kind === "call")!.state).toBe("locked");
  });
  it("marque les niveaux sautés au départ", () => {
    const nodes = buildPath({ level: "B1", startLevel: "B1", xp: 0 }, themeFor("ja").dishes, "B2", true);
    expect(nodes.filter((n) => n.state === "skipped").length).toBe(8); // A1 et A2 : 3 paliers + 1 épreuve chacun
    expect(nodes.find((n) => n.kind === "call")!.state).toBe("done");
  });
  it("donne un thème propre à chaque langue, avec repli par région", () => {
    expect(themeFor("es").landmarks.map((l) => l.label)).toContain("Sagrada Família");
    expect(themeFor("es").dishes.map((l) => l.label)).toContain("Paella");
    expect(themeFor("es-MX").dishes.map((l) => l.label)).toContain("Tacos");
    expect(themeFor("ff").landmarks.length).toBeGreaterThan(0); // peul : repli « Afrique »
    expect(themeFor("custom").landmarks.length).toBeGreaterThan(0);
  });
});
