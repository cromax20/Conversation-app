import { prisma } from "./db";
import { PRICES, isPro, tierOf, type PaidTier } from "./plan";
import { USD_TO_EUR, budgetState, startOfMonth } from "./costs";
import { cacheSavings } from "./ai-cache";

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}

/** Chiffres du mois pour le tableau de bord du propriétaire (estimations, hors impôts). */
export async function dashboard(now = new Date()) {
  const since30 = new Date(now.getTime() - 30 * 86_400_000);
  const month = startOfMonth(now);
  const users = await prisma.user.findMany({ select: { subscriptionStatus: true, currentPeriodEnd: true, plan: true, billingInterval: true, createdAt: true, lastPracticeDay: true } });

  const byTier: Record<PaidTier, { month: number; year: number; trial: number }> = {
    essential: { month: 0, year: 0, trial: 0 }, plus: { month: 0, year: 0, trial: 0 }, premium: { month: 0, year: 0, trial: 0 },
  };
  let mrr = 0, paying = 0, trials = 0;
  for (const u of users) {
    if (!isPro(u, now)) continue;
    const tier = tierOf(u, now) as PaidTier;
    if (u.subscriptionStatus === "trialing") { byTier[tier].trial++; trials++; continue; }
    const interval = u.billingInterval === "year" ? "year" : "month";
    byTier[tier][interval]++;
    paying++;
    mrr += interval === "year" ? PRICES[tier].year / 12 : PRICES[tier].month;
  }

  const costs = await prisma.aiUsage.groupBy({ by: ["tier"], _sum: { costMicros: true }, where: { createdAt: { gte: month } } });
  const costByTier: Record<string, number> = {};
  for (const c of costs) costByTier[c.tier] = ((c._sum.costMicros ?? 0) / 1e6) * USD_TO_EUR;
  const aiCost = Object.values(costByTier).reduce((a, b) => a + b, 0);

  const totalUsers = users.length;
  const signups30 = users.filter((u) => u.createdAt >= since30).length;
  const active30 = users.filter((u) => u.lastPracticeDay && u.lastPracticeDay >= since30).length;
  const fixed = Number(process.env.FIXED_MONTHLY_COSTS_EUR) || 40;
  const chargesRate = Number(process.env.SOCIAL_CHARGES_RATE) || 0.24;
  const stripeFees = paying * 0.25 + mrr * 0.015;
  const charges = mrr * chargesRate;
  const net = mrr - aiCost - stripeFees - fixed - charges;
  const budget = await budgetState(now);
  const cache = await cacheSavings();
  const reused = Object.values(cache.byKind).reduce((a, k) => a + k.hits, 0);
  const savedEur = cache.savedUsd * USD_TO_EUR;

  return {
    byTier, paying, trials, mrr, aiCost, costByTier, stripeFees, fixed, charges, chargesRate, net,
    totalUsers, signups30, active30, conversion: totalUsers ? paying / totalUsers : 0, budget,
    cache: { byKind: cache.byKind, reused, savedEur },
  };
}
