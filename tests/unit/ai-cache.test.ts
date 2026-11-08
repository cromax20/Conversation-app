import { describe, expect, it } from "vitest";
import { cacheKey, normalizeText } from "@/lib/ai-cache";

describe("cache partagé", () => {
  it("normalise les textes : casse, espaces, Unicode", () => {
    expect(normalizeText("  Bonjour   tout  le Monde ")).toBe("bonjour tout le monde");
    expect(normalizeText("Café")).toBe(normalizeText("Café"));
  });
  it("donne la même clé pour une même demande, une autre sinon", () => {
    const a = cacheKey("translate", ["toTarget", "es", "A2", "français", "Je voudrais un café"]);
    expect(cacheKey("translate", ["toTarget", "es", "A2", "français", "  je voudrais UN café "])).toBe(a);
    expect(cacheKey("translate", ["toNative", "es", "A2", "français", "Je voudrais un café"])).not.toBe(a);
    expect(cacheKey("translate", ["toTarget", "es", "B1", "français", "Je voudrais un café"])).not.toBe(a);
    expect(cacheKey("deck", ["toTarget", "es", "A2", "français", "Je voudrais un café"])).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
