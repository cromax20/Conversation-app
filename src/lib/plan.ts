import { prisma } from "./db";

// ---- Formules : Gratuit, Essentiel, Plus, Premium ----

export type Tier = "free" | "essential" | "plus" | "premium";
export const PAID_TIERS = ["essential", "plus", "premium"] as const;
export type PaidTier = (typeof PAID_TIERS)[number];
export type Interval = "month" | "year";

export type PlanUser = { subscriptionStatus: string | null; currentPeriodEnd: Date | null; plan?: string | null };

const ACTIVE = new Set(["active", "trialing"]);

/** Abonnement payant actif (ou en essai). */
export function isPro(u: PlanUser, now = new Date()): boolean {
  if (!u.subscriptionStatus || !ACTIVE.has(u.subscriptionStatus)) return false;
  // Petite marge : Stripe renouvelle parfois quelques minutes après la fin de période.
  return !u.currentPeriodEnd || u.currentPeriodEnd.getTime() + 60 * 60 * 1000 > now.getTime();
}

export const isPaidTier = (v: unknown): v is PaidTier => typeof v === "string" && (PAID_TIERS as readonly string[]).includes(v);

export function tierOf(u: PlanUser, now = new Date()): Tier {
  if (!isPro(u, now)) return "free";
  return isPaidTier(u.plan) ? u.plan : "plus"; // anciens abonnements sans formule : Plus
}

const num = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

/** Ce que comprend chaque formule. Le modèle et les limites se règlent par variables d'environnement. */
export function features(tier: Tier) {
  switch (tier) {
    case "premium":
      return { model: process.env.MODEL_PREMIUM || "claude-opus-5-5", replies: num(process.env.PREMIUM_DAILY_REPLIES, 150), voice: true, calls: true, unlimitedCards: true };
    case "plus":
      return { model: process.env.MODEL_PLUS || "claude-sonnet-5-5", replies: num(process.env.PLUS_DAILY_REPLIES, 100), voice: true, calls: true, unlimitedCards: true };
    case "essential":
      return { model: process.env.MODEL_ESSENTIAL || "claude-haiku-5-5", replies: num(process.env.ESSENTIAL_DAILY_REPLIES, 100), voice: false, calls: false, unlimitedCards: true };
    default:
      return { model: process.env.MODEL_FREE || "claude-haiku-5-5", replies: num(process.env.FREE_DAILY_REPLIES, 10), voice: false, calls: false, unlimitedCards: false };
  }
}

/** Modèle des petites tâches (traductions, phrases utiles, paquets de cartes), quelle que soit la formule. */
export const utilityModel = () => process.env.MODEL_UTILITY || "claude-haiku-5-5";
/** Modèle de notation des épreuves : le même pour tout le monde, pour une notation équitable. */
export const examModel = () => process.env.MODEL_EXAM || "claude-sonnet-5-5";

export function dailyLimit(tier: Tier): number {
  return features(tier).replies;
}

// Prix affichés (en euros) ; les montants facturés sont ceux des prix Stripe.
export const PRICES: Record<PaidTier, Record<Interval, number>> = {
  essential: { month: 7.99, year: 79 },
  plus: { month: 12.99, year: 129 },
  premium: { month: 19.99, year: 199 },
};
export const TRIAL_DAYS: Partial<Record<PaidTier, number>> = { plus: 7 };

const PRICE_ENV: Record<PaidTier, Record<Interval, string>> = {
  essential: { month: "STRIPE_PRICE_ESSENTIAL_MONTHLY", year: "STRIPE_PRICE_ESSENTIAL_YEARLY" },
  plus: { month: "STRIPE_PRICE_PLUS_MONTHLY", year: "STRIPE_PRICE_PLUS_YEARLY" },
  premium: { month: "STRIPE_PRICE_PREMIUM_MONTHLY", year: "STRIPE_PRICE_PREMIUM_YEARLY" },
};

export function stripePriceId(tier: PaidTier, interval: Interval): string | undefined {
  return process.env[PRICE_ENV[tier][interval]] || (tier === "plus" && interval === "month" ? process.env.STRIPE_PRICE_ID : undefined) || undefined;
}

/** Retrouve la formule d'après l'identifiant de prix Stripe. */
export function tierFromPrice(priceId: string | null | undefined): PaidTier | null {
  if (!priceId) return null;
  for (const tier of PAID_TIERS) {
    for (const interval of ["month", "year"] as const) if (stripePriceId(tier, interval) === priceId) return tier;
  }
  return null;
}

export function startOfUtcDay(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Répliques du personnage (= appels à Claude) et traductions consommées aujourd'hui (UTC). */
export async function repliesUsedToday(userId: string, now = new Date()): Promise<number> {
  const since = startOfUtcDay(now);
  const [replies, extra] = await Promise.all([
    prisma.message.count({ where: { role: "assistant", createdAt: { gte: since }, conversation: { userId } } }),
    prisma.usageEvent.count({ where: { userId, kind: "translate", createdAt: { gte: since } } }),
  ]);
  return replies + extra;
}

export async function quotaFor(userId: string, user: PlanUser) {
  const tier = tierOf(user);
  const f = features(tier);
  const used = await repliesUsedToday(userId);
  return { tier, pro: tier !== "free", features: f, limit: f.replies, used, remaining: Math.max(0, f.replies - used) };
}
