// Coût réel des appels à l'IA et budget mensuel.
import { prisma } from "./db";

// Prix en dollars par million de jetons (entrée, sortie, lecture de cache, écriture de cache).
const PRICES: Record<string, [number, number, number, number]> = {
  "claude-opus-5-5": [4, 20, 0.2, 5],
  "claude-sonnet-5-5": [2, 10, 0.2, 2.5],
  "claude-haiku-5-5": [0.1, 0.5, 0.01, 0.125],
};
// Voix (OpenAI) : environ 1,5 ¢ par minute lue (≈ 900 caractères) et 0,3 ¢ par minute dictée.
export const TTS_USD_PER_CHAR = 0.015 / 900;
export const STT_USD_PER_MIN = 0.003;
export const USD_TO_EUR = Number(process.env.USD_TO_EUR) || 0.92;

export type TokenUsage = { input_tokens?: number | null; output_tokens?: number | null; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null };

export function tokenCostUsd(model: string, u: TokenUsage): number {
  const p = PRICES[model] ?? PRICES["claude-opus-5-5"];
  return ((u.input_tokens ?? 0) * p[0] + (u.output_tokens ?? 0) * p[1] + (u.cache_read_input_tokens ?? 0) * p[2] + (u.cache_creation_input_tokens ?? 0) * p[3]) / 1e6;
}

export async function recordUsage(e: { userId: string | null; tier: string; kind: string; model: string; usage?: TokenUsage; usd?: number }) {
  const u = e.usage ?? {};
  const usd = e.usd ?? tokenCostUsd(e.model, u);
  try {
    await prisma.aiUsage.create({
      data: {
        userId: e.userId, tier: e.tier, kind: e.kind, model: e.model,
        inputTokens: u.input_tokens ?? 0, outputTokens: u.output_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0,
        costMicros: Math.round(usd * 1e6),
      },
    });
  } catch (err) {
    console.error("[costs] enregistrement impossible", err); // ne bloque jamais l'utilisateur
  }
}

export function startOfMonth(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function monthSpendEur(now = new Date()): Promise<number> {
  const r = await prisma.aiUsage.aggregate({ _sum: { costMicros: true }, where: { createdAt: { gte: startOfMonth(now) } } });
  return ((r._sum.costMicros ?? 0) / 1e6) * USD_TO_EUR;
}

/** Budget IA mensuel (en euros), facultatif : AI_MONTHLY_BUDGET_EUR. */
export function monthlyBudgetEur(): number | null {
  const n = Number(process.env.AI_MONTHLY_BUDGET_EUR);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Part du budget à partir de laquelle l'offre gratuite est mise en pause (les abonnés continuent). */
export const FREE_PAUSE_AT = 0.85;

export async function budgetState(now = new Date()) {
  const budget = monthlyBudgetEur();
  const spent = await monthSpendEur(now);
  const ratio = budget ? spent / budget : 0;
  return { budget, spent, ratio, freePaused: Boolean(budget) && ratio >= FREE_PAUSE_AT, exhausted: Boolean(budget) && ratio >= 1 };
}

/**
 * Faut-il refuser cet appel ? Gratuit : en pause près du budget. Abonnés : jamais, sauf si
 * AI_BUDGET_HARD_STOP=1 et le budget est entièrement consommé.
 */
export async function budgetBlocks(tier: string): Promise<boolean> {
  if (!monthlyBudgetEur()) return false;
  const s = await budgetState();
  if (tier === "free") return s.freePaused;
  return process.env.AI_BUDGET_HARD_STOP === "1" && s.exhausted;
}
