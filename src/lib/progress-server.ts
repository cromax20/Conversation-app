import { prisma } from "./db";
import { palierInfo, updateStreak, xpForMessage } from "./progress";

/** Ajoute les XP d'un message à la progression de la langue et met à jour la série de jours. */
export async function awardPractice(userId: string, key: string, text: string) {
  const xp = xpForMessage(text);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { streakDays: true, bestStreak: true, lastPracticeDay: true } });
  if (!user) return null;
  const streak = updateStreak(user);
  const [, progress] = await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: streak }),
    prisma.languageProgress.update({ where: { userId_key: { userId, key } }, data: { xp: { increment: xp }, totalXp: { increment: xp } } }),
  ]);
  const before = palierInfo(progress.xp - xp);
  const after = palierInfo(progress.xp);
  return {
    xp,
    level: progress.level,
    palier: after.palier,
    palierUp: after.palier > before.palier,
    examReady: after.examReady,
    examJustUnlocked: after.examReady && !before.examReady,
    streakDays: streak.streakDays,
  };
}
