import { describe, expect, it } from "vitest";
import { XP_FOR_EXAM, currentStreak, nextLevel, palierInfo, updateStreak, xpForMessage } from "@/lib/progress";

describe("XP", () => {
  it("récompense les messages plus longs, avec un plafond", () => {
    expect(xpForMessage("hola")).toBe(6);
    expect(xpForMessage("uno dos tres cuatro cinco")).toBe(10);
    expect(xpForMessage("palabra ".repeat(100))).toBe(25);
  });
  it("ne donne rien pour help, stop ou un message vide", () => {
    expect(xpForMessage("help")).toBe(0);
    expect(xpForMessage(" STOP ")).toBe(0);
    expect(xpForMessage("  ")).toBe(0);
  });
});

describe("paliers", () => {
  it("passe du palier 1 au palier 3 puis débloque l'épreuve", () => {
    expect(palierInfo(0)).toMatchObject({ palier: 1, intoPalier: 0, examReady: false, percentToExam: 0 });
    expect(palierInfo(149)).toMatchObject({ palier: 1, intoPalier: 149 });
    expect(palierInfo(150)).toMatchObject({ palier: 2, intoPalier: 0 });
    expect(palierInfo(449)).toMatchObject({ palier: 3, examReady: false });
    expect(palierInfo(XP_FOR_EXAM)).toMatchObject({ palier: 3, examReady: true, percentToExam: 100 });
    expect(palierInfo(9999)).toMatchObject({ palier: 3, examReady: true, percentToExam: 100 });
  });
  it("enchaîne les niveaux jusqu'à C2", () => {
    expect(nextLevel("A1")).toBe("A2");
    expect(nextLevel("C1")).toBe("C2");
    expect(nextLevel("C2")).toBeNull();
  });
});

describe("série de jours", () => {
  const d = (s: string) => new Date(s);
  it("démarre à 1, augmente le lendemain, repart à 1 après une pause", () => {
    const first = updateStreak({ streakDays: 0, bestStreak: 0, lastPracticeDay: null }, d("2026-11-01T10:00:00Z"));
    expect(first.streakDays).toBe(1);
    const sameDay = updateStreak(first, d("2026-11-01T22:00:00Z"));
    expect(sameDay.streakDays).toBe(1);
    const next = updateStreak(first, d("2026-11-02T08:00:00Z"));
    expect(next).toMatchObject({ streakDays: 2, bestStreak: 2 });
    const broken = updateStreak(next, d("2026-11-05T08:00:00Z"));
    expect(broken).toMatchObject({ streakDays: 1, bestStreak: 2 });
  });
  it("affiche 0 si la série est cassée", () => {
    const u = { streakDays: 4, lastPracticeDay: d("2026-11-01T00:00:00Z") };
    expect(currentStreak(u, d("2026-11-02T12:00:00Z"))).toBe(4);
    expect(currentStreak(u, d("2026-11-03T12:00:00Z"))).toBe(0);
  });
});
