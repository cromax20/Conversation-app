import { describe, expect, it } from "vitest";
import { TOPICS, buildQuiz, nextReview, type Card } from "@/lib/cards";
import { fr } from "@/i18n/fr";

const cards: Card[] = Array.from({ length: 10 }, (_, i) => ({ front: `palabra${i}`, pronunciation: "", back: `mot${i}`, example: "" }));

describe("révision espacée", () => {
  const now = new Date("2026-11-07T10:00:00Z");
  it("fait monter une carte connue de boîte et l'espace dans le temps", () => {
    expect(nextReview(1, true, now)).toEqual({ box: 2, due: new Date("2026-11-08T10:00:00Z") });
    expect(nextReview(3, true, now).box).toBe(4);
    expect(nextReview(5, true, now)).toEqual({ box: 5, due: new Date("2026-11-23T10:00:00Z") });
  });
  it("renvoie une carte ratée en boîte 1, à revoir très vite", () => {
    const r = nextReview(4, false, now);
    expect(r.box).toBe(1);
    expect(r.due.getTime() - now.getTime()).toBe(10 * 60_000);
  });
});

describe("quiz", () => {
  it("pose 10 questions à 4 choix, dans les deux sens, avec la bonne réponse parmi les choix", () => {
    const qs = buildQuiz(cards);
    expect(qs).toHaveLength(10);
    for (const q of qs) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.answer);
    }
    expect(qs.some((q) => q.direction === "toNative")).toBe(true);
    expect(qs.some((q) => q.direction === "toTarget")).toBe(true);
  });
  it("refuse de construire un quiz avec moins de 4 cartes", () => {
    expect(buildQuiz(cards.slice(0, 3))).toEqual([]);
  });
  it("chaque thème est traduit", () => {
    for (const t of TOPICS) expect(fr.cards.topics[t.id]).toBeTruthy();
  });
});
