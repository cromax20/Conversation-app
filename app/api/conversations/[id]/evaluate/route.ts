import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { jsonError, notFound, unauthorized } from "@/lib/http";
import { evaluateExam, ReplyError } from "@/lib/claude";
import { LEVELS, type Level } from "@/lib/characters";
import { recordUsage } from "@/lib/costs";
import { tierOf } from "@/lib/plan";
import { MIN_EXAM_ANSWERS, PALIERS_PER_LEVEL, XP_PER_PALIER } from "@/lib/progress";

export const maxDuration = 60;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const conv = await prisma.conversation.findFirst({
    where: { id, userId: user.id, mode: "exam" },
    include: { messages: { orderBy: { createdAt: "asc" }, select: { role: true, text: true } } },
  });
  if (!conv) return notFound();
  if (conv.examResult) return Response.json({ result: conv.examResult });

  const answers = conv.messages.filter((m) => m.role === "user").length;
  if (answers < MIN_EXAM_ANSWERS) return jsonError(409, "too_short", `Répondez au moins ${MIN_EXAM_ANSWERS} fois avant de terminer l'épreuve.`);

  let result;
  try {
    result = await evaluateExam({
      transcript: conv.messages,
      languageName: conv.languageName,
      target: conv.level,
      levelDescription: LEVELS[conv.level as Level],
      nativeLang: conv.nativeLang,
      onUsage: (model, usage) => void recordUsage({ userId: user.id, tier: tierOf(user), kind: "exam", model, usage }),
    });
  } catch (e) {
    console.error("[evaluate]", e instanceof ReplyError ? e.code : e);
    return jsonError(502, "evaluation_failed", "L'évaluation a échoué. Réessayez dans un instant.");
  }
  if ("refused" in result) return jsonError(422, "refused", "L'évaluation n'a pas pu être faite pour cette épreuve.");

  await prisma.$transaction([
    prisma.conversation.update({ where: { id }, data: { examResult: result } }),
    ...(result.passed
      ? [prisma.languageProgress.update({ where: { userId_key: { userId: user.id, key: conv.progressKey } }, data: { level: conv.level, xp: 0, examsPassed: { increment: 1 } } })]
      // Épreuve ratée : retour au début du 3e palier, il faut s'entraîner encore un peu.
      : [prisma.languageProgress.update({ where: { userId_key: { userId: user.id, key: conv.progressKey } }, data: { xp: XP_PER_PALIER * (PALIERS_PER_LEVEL - 1) } })]),
  ]);
  return Response.json({ result });
}
