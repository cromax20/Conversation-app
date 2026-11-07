import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { jsonError, unauthorized } from "@/lib/http";
import { generateDeck, ReplyError } from "@/lib/claude";
import { TOPICS, isTopic } from "@/lib/cards";
import { cardsUsage, over } from "@/lib/cards-server";

export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = z.object({ key: z.string(), topic: z.string() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isTopic(parsed.data.topic)) return jsonError(400, "invalid", "Requête invalide.");
  const { key, topic } = parsed.data;

  const progress = await prisma.languageProgress.findUnique({ where: { userId_key: { userId: user.id, key } } });
  if (!progress) return jsonError(404, "not_found", "Langue introuvable.");
  const existing = await prisma.deck.findUnique({ where: { userId_key_level_topic: { userId: user.id, key, level: progress.level, topic } } });
  if (existing) return Response.json({ id: existing.id, cards: existing.cards });

  const usage = await cardsUsage(user.id, user);
  if (over(usage, "decks")) return jsonError(429, "decks_limit", "Limite de paquets atteinte.");

  const last = await prisma.conversation.findFirst({ where: { userId: user.id, progressKey: key }, orderBy: { updatedAt: "desc" }, select: { nativeLang: true } });
  try {
    const cards = await generateDeck({ languageName: progress.languageName, level: progress.level, nativeLang: last?.nativeLang ?? "français", topic: TOPICS.find((x) => x.id === topic)!.fr });
    if ("refused" in cards) return jsonError(422, "refused", "Refusé.");
    const [deck] = await prisma.$transaction([
      prisma.deck.create({ data: { userId: user.id, key, languageName: progress.languageName, level: progress.level, topic, cards } }),
      prisma.usageEvent.create({ data: { userId: user.id, kind: "deck" } }),
    ]);
    return Response.json({ id: deck.id, cards }, { status: 201 });
  } catch (e) {
    console.error("[decks]", e instanceof ReplyError ? e.code : e);
    return jsonError(502, e instanceof ReplyError ? e.code : "reply_failed", "Échec.");
  }
}
