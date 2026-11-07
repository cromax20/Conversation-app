import { prisma } from "./db";

export type PlanUser = { subscriptionStatus: string | null; currentPeriodEnd: Date | null };

const ACTIVE = new Set(["active", "trialing"]);

export function isPro(u: PlanUser, now = new Date()): boolean {
  if (!u.subscriptionStatus || !ACTIVE.has(u.subscriptionStatus)) return false;
  // Petite marge : Stripe renouvelle parfois quelques minutes après la fin de période.
  return !u.currentPeriodEnd || u.currentPeriodEnd.getTime() + 60 * 60 * 1000 > now.getTime();
}

export function dailyLimit(pro: boolean): number {
  const v = Number(pro ? process.env.PRO_DAILY_REPLIES ?? 300 : process.env.FREE_DAILY_REPLIES ?? 10);
  return Number.isFinite(v) && v > 0 ? v : pro ? 300 : 10;
}

export function startOfUtcDay(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Nombre de réponses du personnage (= appels à Claude) consommées aujourd'hui (UTC). */
export async function repliesUsedToday(userId: string, now = new Date()): Promise<number> {
  return prisma.message.count({
    where: { role: "assistant", createdAt: { gte: startOfUtcDay(now) }, conversation: { userId } },
  });
}

export async function quotaFor(userId: string, user: PlanUser) {
  const pro = isPro(user);
  const limit = dailyLimit(pro);
  const used = await repliesUsedToday(userId);
  return { pro, limit, used, remaining: Math.max(0, limit - used) };
}
