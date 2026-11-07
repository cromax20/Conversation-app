import { LEVEL_ORDER, type Level } from "./characters";
import { isPro, type PlanUser } from "./plan";

/** Niveau (validé par une épreuve) qui débloque gratuitement l'appel vidéo. */
export function callFreeLevel(): Level {
  const v = process.env.CALL_FREE_LEVEL as Level | undefined;
  return v && LEVEL_ORDER.includes(v) ? v : "B2";
}

type ProgressLike = { level: string; examsPassed: number };

/** Gratuit si un niveau ≥ seuil a été validé par une épreuve dans cette langue. */
export function freeCallUnlocked(p: ProgressLike | null | undefined, freeLevel = callFreeLevel()): boolean {
  if (!p || p.examsPassed < 1) return false;
  return LEVEL_ORDER.indexOf(p.level as Level) >= LEVEL_ORDER.indexOf(freeLevel);
}

export function canCall(user: PlanUser, p: ProgressLike | null | undefined): boolean {
  return isPro(user) || freeCallUnlocked(p);
}
