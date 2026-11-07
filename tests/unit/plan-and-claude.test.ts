import { describe, expect, it } from "vitest";
import { dailyLimit, isPro, startOfUtcDay } from "@/lib/plan";
import { buildMessages } from "@/lib/claude";
import { KICKOFF } from "@/lib/characters";
import { periodEnd } from "@/lib/stripe";

describe("abonnement", () => {
  const now = new Date("2026-11-07T12:00:00Z");
  it("reconnaît un abonnement actif ou en essai", () => {
    expect(isPro({ subscriptionStatus: "active", currentPeriodEnd: new Date("2026-12-01") }, now)).toBe(true);
    expect(isPro({ subscriptionStatus: "trialing", currentPeriodEnd: null }, now)).toBe(true);
  });
  it("refuse un abonnement annulé, impayé ou expiré", () => {
    expect(isPro({ subscriptionStatus: "canceled", currentPeriodEnd: new Date("2026-12-01") }, now)).toBe(false);
    expect(isPro({ subscriptionStatus: "past_due", currentPeriodEnd: new Date("2026-12-01") }, now)).toBe(false);
    expect(isPro({ subscriptionStatus: "active", currentPeriodEnd: new Date("2026-11-01") }, now)).toBe(false);
    expect(isPro({ subscriptionStatus: null, currentPeriodEnd: null }, now)).toBe(false);
  });
  it("applique les limites par défaut", () => {
    expect(dailyLimit(false)).toBe(10);
    expect(dailyLimit(true)).toBe(300);
  });
  it("compte les jours en UTC", () => {
    expect(startOfUtcDay(new Date("2026-11-07T23:30:00+02:00")).toISOString()).toBe("2026-11-07T00:00:00.000Z");
  });
  it("lit la fin de période sur l'item (API Stripe récente) ou sur l'abonnement", () => {
    expect(periodEnd({ items: { data: [{ current_period_end: 1800000000 }] } } as never)?.getTime()).toBe(1800000000000);
    expect(periodEnd({ current_period_end: 1700000000, items: { data: [] } } as never)?.getTime()).toBe(1700000000000);
  });
});

describe("historique envoyé à Claude", () => {
  it("commence par l'ouverture, puis rejoue les messages sans les modifier", () => {
    const blocks = [{ type: "thinking", thinking: "", signature: "sig" }, { type: "text", text: "¡Hola!" }];
    const msgs = buildMessages([
      { role: "assistant", text: "¡Hola!", content: blocks },
      { role: "user", text: "Hola, un café por favor", content: null },
    ]);
    expect(msgs[0]).toEqual({ role: "user", content: KICKOFF });
    expect(msgs[1]).toEqual({ role: "assistant", content: blocks });
    expect(msgs[2]).toEqual({ role: "user", content: "Hola, un café por favor" });
  });
  it("utilise le texte si les blocs d'origine manquent", () => {
    expect(buildMessages([{ role: "assistant", text: "Bonjour", content: null }])[1]).toEqual({ role: "assistant", content: "Bonjour" });
  });
});
