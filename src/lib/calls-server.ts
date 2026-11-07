import { prisma } from "./db";
import { features, tierOf, type PlanUser } from "./plan";
import { callAccess, freeCallActive, freeCallUnlocked, WEEK_MS } from "./calls";

export async function lastFreeCall(userId: string): Promise<Date | null> {
  const e = await prisma.usageEvent.findFirst({ where: { userId, kind: "free_call", createdAt: { gte: new Date(Date.now() - WEEK_MS) } }, orderBy: { createdAt: "desc" } });
  return e?.createdAt ?? null;
}

export async function accessFor(userId: string, user: PlanUser, p: { level: string; examsPassed: number } | null) {
  return callAccess(user, p, await lastFreeCall(userId));
}

/**
 * Voix et dictée : incluses dans Plus et Premium ; sinon seulement pendant un appel gratuit
 * encore ouvert, dans une langue où l'appel est débloqué.
 */
export async function voiceAllowed(userId: string, user: PlanUser, conv: { mode: string; progressKey: string; createdAt: Date } | null): Promise<boolean> {
  if (features(tierOf(user)).voice) return true;
  if (!conv || conv.mode !== "call" || !freeCallActive(conv)) return false;
  const p = await prisma.languageProgress.findUnique({ where: { userId_key: { userId, key: conv.progressKey } } });
  return freeCallUnlocked(p);
}
