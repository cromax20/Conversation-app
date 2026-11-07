import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { jsonError, unauthorized } from "@/lib/http";
import { QUIZ_LENGTH, XP_PER_CORRECT } from "@/lib/cards";
import { awardXp } from "@/lib/progress-server";
import { startOfUtcDay } from "@/lib/plan";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = z.object({ key: z.string(), correct: z.number().int().min(0).max(QUIZ_LENGTH) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid", "Requête invalide.");

  // Un quiz terminé ne rapporte des XP que s'il a été commencé (au plus autant de fins que de débuts dans la journée).
  const since = startOfUtcDay();
  const [started, finished] = await Promise.all([
    prisma.usageEvent.count({ where: { userId: user.id, kind: "quiz", createdAt: { gte: since } } }),
    prisma.usageEvent.count({ where: { userId: user.id, kind: "quiz_done", createdAt: { gte: since } } }),
  ]);
  if (finished >= started) return jsonError(409, "no_quiz", "Aucun quiz en cours.");
  const progress = await prisma.languageProgress.findUnique({ where: { userId_key: { userId: user.id, key: parsed.data.key } } });
  if (!progress) return jsonError(404, "not_found", "Langue introuvable.");

  await prisma.usageEvent.create({ data: { userId: user.id, kind: "quiz_done" } });
  const reward = await awardXp(user.id, progress.key, parsed.data.correct * XP_PER_CORRECT);
  return Response.json({ reward });
}
