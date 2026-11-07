import { describe, expect, it } from "vitest";
import { tokenCostUsd } from "@/lib/costs";
import { windowHistory } from "@/lib/claude";
import { checkoutCoupon, welcomeEndsAt } from "@/lib/growth";
import { renderEmail } from "@/i18n/emails";

describe("coût réel", () => {
  it("calcule le coût d'une réplique selon le modèle", () => {
    const u = { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 2000, cache_creation_input_tokens: 0 };
    expect(tokenCostUsd("claude-opus-5-5", u)).toBeCloseTo((1000 * 4 + 200 * 20 + 2000 * 0.2) / 1e6, 10);
    expect(tokenCostUsd("claude-haiku-5-5", u)).toBeCloseTo((1000 * 0.1 + 200 * 0.5 + 2000 * 0.01) / 1e6, 10);
    expect(tokenCostUsd("claude-haiku-5-5", u)).toBeLessThan(tokenCostUsd("claude-sonnet-5-5", u) / 10);
  });
});

describe("historique des longues conversations", () => {
  const h = (n: number) => Array.from({ length: n }, (_, i) => i);
  it("ne touche pas aux conversations courtes", () => {
    expect(windowHistory(h(60))).toHaveLength(60);
  });
  it("retire les plus anciens messages par paquets de 20, toujours depuis le début", () => {
    expect(windowHistory(h(61))).toEqual(h(61).slice(20));
    expect(windowHistory(h(79))[0]).toBe(20); // même découpe : le cache reste valable
    expect(windowHistory(h(80))[0]).toBe(40);
    expect(windowHistory(h(200)).length).toBeLessThanOrEqual(60);
  });
});

describe("offres", () => {
  const now = new Date("2026-11-07T12:00:00Z");
  const fresh = { subscriptionStatus: null, currentPeriodEnd: null, createdAt: new Date("2026-11-06T12:00:00Z"), subscriptionId: null, referredBy: null as string | null };
  it("offre de bienvenue pendant 72 h, sur l'annuel seulement, si le coupon existe", () => {
    process.env.STRIPE_COUPON_WELCOME = "coupon_w";
    expect(welcomeEndsAt(fresh, now)?.toISOString()).toBe("2026-11-09T12:00:00.000Z");
    expect(checkoutCoupon(fresh, "year", now)).toBe("coupon_w");
    expect(checkoutCoupon(fresh, "month", now)).toBeNull();
    expect(welcomeEndsAt({ ...fresh, createdAt: new Date("2026-11-01T12:00:00Z") }, now)).toBeNull();
    expect(welcomeEndsAt({ ...fresh, subscriptionId: "sub_1" }, now)).toBeNull();
    delete process.env.STRIPE_COUPON_WELCOME;
    expect(welcomeEndsAt(fresh, now)).toBeNull();
  });
  it("réduction de parrainage pour un·e filleul·e jamais abonné·e", () => {
    process.env.STRIPE_COUPON_REFERRAL = "coupon_r";
    expect(checkoutCoupon({ ...fresh, referredBy: "ABCDE12" }, "month", now)).toBe("coupon_r");
    expect(checkoutCoupon({ ...fresh, referredBy: "ABCDE12", subscriptionId: "sub_1" }, "month", now)).toBeNull();
    delete process.env.STRIPE_COUPON_REFERRAL;
  });
});

describe("e-mails de relance", () => {
  it("existent dans les 6 langues, avec un lien de désinscription", () => {
    for (const l of ["fr", "en", "es", "pt", "ar", "de"] as const) {
      const m = renderEmail(l, "streak", { n: 5 }, { cta: "https://x/parcours", unsubscribe: "https://x/u" });
      expect(m.subject).toContain("5");
      expect(m.html).toContain("https://x/u");
    }
    expect(renderEmail("ar", "offer", { p: 30 }, { cta: "a", unsubscribe: "b" }).html).toContain('dir="rtl"');
  });
});
