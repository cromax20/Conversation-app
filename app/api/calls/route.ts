import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { jsonError, unauthorized } from "@/lib/http";
import { canCall } from "@/lib/calls";
import { parseAvatar } from "@/lib/avatar";
import { CUSTOM, LEVEL_ORDER, MAX_FIELD_LENGTH, buildCallPrompt, type Level } from "@/lib/characters";

const Body = z.object({
  key: z.string(),
  name: z.string().trim().max(MAX_FIELD_LENGTH),
  age: z.number().int().min(16).max(99),
  place: z.string().trim().max(MAX_FIELD_LENGTH),
  topic: z.string().trim().max(200),
  avatar: z.unknown(),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  const avatar = parsed.success ? parseAvatar(parsed.data.avatar) : null;
  if (!parsed.success || !avatar) return jsonError(400, "invalid", "Réglages invalides.");
  const b = parsed.data;

  const progress = await prisma.languageProgress.findUnique({ where: { userId_key: { userId: user.id, key: b.key } } });
  if (!progress) return jsonError(404, "not_found", "Langue introuvable.");
  if (!canCall(user, progress)) return jsonError(403, "call_locked", "Appel vidéo verrouillé.");

  const isCustom = progress.key.startsWith("custom:");
  const lang = isCustom ? { language: CUSTOM, customLanguage: progress.languageName } : { language: progress.key };
  const last = await prisma.conversation.findFirst({ where: { userId: user.id, progressKey: progress.key }, orderBy: { updatedAt: "desc" }, select: { nativeLang: true } });
  const nativeLang = last?.nativeLang ?? "français";
  const level = (LEVEL_ORDER.includes(progress.level as Level) ? progress.level : "B1") as Level;

  const conv = await prisma.conversation.create({
    data: {
      userId: user.id,
      title: `Appel · ${b.name || "?"} · ${progress.languageName}`,
      language: lang.language,
      languageName: progress.languageName,
      progressKey: progress.key,
      level,
      mode: "call",
      nativeLang,
      scene: "call",
      context: b.topic,
      character: { name: b.name, age: b.age, city: b.place, job: "", trait: "", hobby: "", avatar },
      systemPrompt: buildCallPrompt({ ...lang, level, nativeLang, name: b.name, age: b.age, place: b.place, topic: b.topic }),
    },
  });
  return Response.json({ id: conv.id }, { status: 201 });
}
