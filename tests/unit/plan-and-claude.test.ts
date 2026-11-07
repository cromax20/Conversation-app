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
  it("applique les limites par défaut de chaque formule", () => {
    expect(dailyLimit("free")).toBe(10);
    expect(dailyLimit("essential")).toBe(100);
    expect(dailyLimit("plus")).toBe(100);
    expect(dailyLimit("premium")).toBe(150);
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

import { features, tierFromPrice, tierOf, stripePriceId, PRICES } from "@/lib/plan";
import { callAccess, freeCallActive } from "@/lib/calls";

describe("formules", () => {
  const now = new Date("2026-11-07T12:00:00Z");
  const sub = (plan: string | null) => ({ subscriptionStatus: "active", currentPeriodEnd: new Date("2026-12-01"), plan });
  it("donne à chaque formule son modèle et ses fonctions", () => {
    expect(features("free")).toMatchObject({ model: "claude-haiku-5-5", voice: false, calls: false, unlimitedCards: false });
    expect(features("essential")).toMatchObject({ model: "claude-haiku-5-5", voice: false, calls: false, unlimitedCards: true });
    expect(features("plus")).toMatchObject({ model: "claude-sonnet-5-5", voice: true, calls: true });
    expect(features("premium")).toMatchObject({ model: "claude-opus-5-5", voice: true, calls: true });
  });
  it("lit la formule de l'abonné, Plus par défaut pour un ancien abonnement", () => {
    expect(tierOf(sub("premium"), now)).toBe("premium");
    expect(tierOf(sub(null), now)).toBe("plus");
    expect(tierOf({ ...sub("premium"), subscriptionStatus: "canceled" }, now)).toBe("free");
  });
  it("affiche les prix convenus", () => {
    expect(PRICES).toEqual({ essential: { month: 7.99, year: 79 }, plus: { month: 12.99, year: 129 }, premium: { month: 19.99, year: 199 } });
  });
  it("retrouve la formule d'après le prix Stripe", () => {
    process.env.STRIPE_PRICE_PREMIUM_YEARLY = "price_prem_y";
    expect(stripePriceId("premium", "year")).toBe("price_prem_y");
    expect(tierFromPrice("price_prem_y")).toBe("premium");
    expect(tierFromPrice("price_inconnu")).toBeNull();
    delete process.env.STRIPE_PRICE_PREMIUM_YEARLY;
  });
  it("appel gratuit : 1 par semaine une fois B2 validé, 10 minutes", () => {
    const free = { subscriptionStatus: null, currentPeriodEnd: null };
    const b2 = { level: "B2", examsPassed: 1 };
    expect(callAccess(free, { level: "B1", examsPassed: 1 }, null, now)).toBe("locked");
    expect(callAccess(free, b2, null, now)).toBe("weekly");
    expect(callAccess(free, b2, new Date("2026-11-04T12:00:00Z"), now)).toBe("weekly_used");
    expect(callAccess(free, b2, new Date("2026-10-30T12:00:00Z"), now)).toBe("weekly");
    expect(callAccess(sub("essential"), b2, null, now)).toBe("weekly");
    expect(callAccess(sub("plus"), { level: "A1", examsPassed: 0 }, null, now)).toBe("plan");
    expect(freeCallActive({ createdAt: new Date("2026-11-07T11:55:00Z") }, now)).toBe(true);
    expect(freeCallActive({ createdAt: new Date("2026-11-07T11:49:00Z") }, now)).toBe(false);
  });
});
