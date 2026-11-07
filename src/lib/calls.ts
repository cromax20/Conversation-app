import { LEVEL_ORDER, type Level } from "./characters";
import { features, tierOf, type PlanUser } from "./plan";

/** Niveau (validé par une épreuve) qui débloque l'appel vidéo gratuit hebdomadaire. */
export function callFreeLevel(): Level {
  const v = process.env.CALL_FREE_LEVEL as Level | undefined;
  return v && LEVEL_ORDER.includes(v) ? v : "B2";
}
/** Durée de l'appel gratuit hebdomadaire, en minutes. */
export const freeCallMinutes = () => {
  const n = Number(process.env.FREE_CALL_MINUTES);
  return Number.isFinite(n) && n > 0 ? n : 10;
};
export const WEEK_MS = 7 * 86_400_000;

type ProgressLike = { level: string; examsPassed: number };

/** Niveau ≥ seuil validé par une épreuve dans cette langue. */
export function freeCallUnlocked(p: ProgressLike | null | undefined, freeLevel = callFreeLevel()): boolean {
  if (!p || p.examsPassed < 1) return false;
  return LEVEL_ORDER.indexOf(p.level as Level) >= LEVEL_ORDER.indexOf(freeLevel);
}

export type CallAccess = "plan" | "weekly" | "weekly_used" | "locked";

/** Plus et Premium : appels inclus. Sinon : 1 appel par semaine une fois le niveau validé. */
export function callAccess(user: PlanUser, p: ProgressLike | null | undefined, lastFreeCall: Date | null, now = new Date()): CallAccess {
  if (features(tierOf(user, now)).calls) return "plan";
  if (!freeCallUnlocked(p)) return "locked";
  return lastFreeCall && now.getTime() - lastFreeCall.getTime() < WEEK_MS ? "weekly_used" : "weekly";
}

/** Un appel gratuit reste ouvert pendant sa durée (10 min par défaut) à partir de sa création. */
export function freeCallActive(conv: { createdAt: Date }, now = new Date()): boolean {
  return now.getTime() - conv.createdAt.getTime() < freeCallMinutes() * 60_000;
}

export function nextFreeCall(lastFreeCall: Date | null): Date | null {
  return lastFreeCall ? new Date(lastFreeCall.getTime() + WEEK_MS) : null;
}
