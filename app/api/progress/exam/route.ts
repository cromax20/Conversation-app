import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { jsonError, unauthorized } from "@/lib/http";
import { CUSTOM, LEVELS, languageLine, type Level } from "@/lib/characters";
import { examSystemPrompt, nextLevel, palierInfo } from "@/lib/progress";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = z.object({ key: z.string() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid", "Requête invalide.");

  const progress = await prisma.languageProgress.findUnique({ where: { userId_key: { userId: user.id, key: parsed.data.key } } });
  if (!progress) return jsonError(404, "not_found", "Langue introuvable.");
  const target = nextLevel(progress.level);
  if (!target) return jsonError(409, "max_level", "Vous avez atteint le plus haut niveau.");
  if (!palierInfo(progress.xp).examReady) return jsonError(409, "not_ready", "Terminez d'abord les 3 paliers de votre niveau.");

  const isCustom = progress.key.startsWith("custom:");
  const lang = isCustom ? { language: CUSTOM, customLanguage: progress.languageName } : { language: progress.key };
  const last = await prisma.conversation.findFirst({ where: { userId: user.id, progressKey: progress.key }, orderBy: { updatedAt: "desc" }, select: { nativeLang: true } });
  const nativeLang = last?.nativeLang ?? "français";

  const conv = await prisma.conversation.create({
    data: {
      userId: user.id,
      title: `Épreuve ${target} · ${progress.languageName}`,
      language: lang.language,
      languageName: progress.languageName,
      progressKey: progress.key,
      level: target,
      mode: "exam",
      nativeLang,
      scene: `Épreuve de passage ${target}`,
      context: "une conversation d'environ 8 échanges pour valider le niveau",
      character: { name: "Examinateur·rice", age: 40, city: "", job: "", trait: "", hobby: "" },
      systemPrompt: examSystemPrompt({ languageLine: languageLine(lang), target: target as Level, nativeLang, levelDescription: LEVELS[target as Level] }),
    },
  });
  await prisma.languageProgress.update({ where: { id: progress.id }, data: { examsTaken: { increment: 1 } } });
  return Response.json({ id: conv.id }, { status: 201 });
}
