// Progression façon jeu : points d'expérience (XP), paliers, séries de jours et épreuves de passage.
import { LEVEL_ORDER, type Level } from "./characters";

export const PALIERS_PER_LEVEL = 3;
export const XP_PER_PALIER = 150;
export const XP_FOR_EXAM = PALIERS_PER_LEVEL * XP_PER_PALIER;
export const MIN_EXAM_ANSWERS = 5;

export const PALIER_NAMES = ["Explorateur·rice", "Voyageur·se", "Habitué·e"];
export const LEVEL_TITLES: Record<Level, string> = {
  A1: "Premiers pas", A2: "Débrouillard·e", B1: "Indépendant·e", B2: "Aisance", C1: "Expert·e", C2: "Comme chez soi",
};

/** XP gagnés pour un message de l'élève : plus il s'exprime, plus il gagne (plafonné). */
export function xpForMessage(text: string): number {
  const t = text.trim();
  if (!t || /^(help|stop)$/i.test(t)) return 0;
  const words = t.split(/\s+/).length;
  return 5 + Math.min(20, words);
}

export function nextLevel(level: string): Level | null {
  const i = LEVEL_ORDER.indexOf(level as Level);
  return i >= 0 && i < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[i + 1] : null;
}

export function palierInfo(xp: number) {
  const capped = Math.min(xp, XP_FOR_EXAM);
  const palier = Math.min(PALIERS_PER_LEVEL, Math.floor(capped / XP_PER_PALIER) + 1);
  const intoPalier = capped >= XP_FOR_EXAM ? XP_PER_PALIER : capped - (palier - 1) * XP_PER_PALIER;
  return {
    palier, // 1 … 3
    palierName: PALIER_NAMES[palier - 1],
    intoPalier,
    palierSize: XP_PER_PALIER,
    examReady: xp >= XP_FOR_EXAM,
    percentToExam: Math.round((capped / XP_FOR_EXAM) * 100),
  };
}

const DAY = 24 * 60 * 60 * 1000;
const dayStart = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** Met à jour la série de jours d'affilée après une séance de pratique. */
export function updateStreak(prev: { streakDays: number; bestStreak: number; lastPracticeDay: Date | null }, now = new Date()) {
  const today = dayStart(now);
  let streak = 1;
  if (prev.lastPracticeDay) {
    const last = dayStart(prev.lastPracticeDay);
    if (last === today) streak = Math.max(1, prev.streakDays);
    else if (last === today - DAY) streak = prev.streakDays + 1;
  }
  return { streakDays: streak, bestStreak: Math.max(prev.bestStreak, streak), lastPracticeDay: new Date(today) };
}

/** Série affichée : retombe à 0 si l'élève n'a pas pratiqué hier ni aujourd'hui. */
export function currentStreak(u: { streakDays: number; lastPracticeDay: Date | null }, now = new Date()): number {
  if (!u.lastPracticeDay) return 0;
  return dayStart(now) - dayStart(u.lastPracticeDay) <= DAY ? u.streakDays : 0;
}

export function examSystemPrompt(opts: { languageLine: string; target: Level; nativeLang: string; levelDescription: string }): string {
  return `Tu es examinateur·rice bienveillant·e pour une épreuve orale de passage au niveau ${opts.target} du CECRL.
${opts.languageLine} Adapte-toi au niveau ${opts.target} : ${opts.levelDescription}.
L'élève parle ${opts.nativeLang}.

Déroulé :
- Ouvre l'épreuve par une courte présentation chaleureuse (dans la langue cible), puis pose une première question.
- Mène une vraie conversation d'environ 8 échanges qui fait appel aux compétences attendues au niveau ${opts.target} (se présenter, raconter, décrire, donner son avis, argumenter… selon le niveau).
- Une seule question à la fois, en 1 à 3 phrases. Augmente doucement la difficulté.
- Ne corrige pas pendant l'épreuve et ne donne pas de note : l'évaluation se fait à la fin.
- Si l'élève écrit "help", reformule ta question plus simplement, puis continue.`;
}
