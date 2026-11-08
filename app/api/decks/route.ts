import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { jsonError, unauthorized } from "@/lib/http";
import { generateDeck, ReplyError } from "@/lib/claude";
import { TOPICS, isTopic } from "@/lib/cards";
import { cardsUsage, over } from "@/lib/cards-server";
import { budgetBlocks, recordUsage } from "@/lib/costs";
import { tierOf } from "@/lib/plan";
import { GenerationBlocked, cachedJson } from "@/lib/ai-cache";
import { tokenCostUsd } from "@/lib/costs";
import type { Card } from "@/lib/cards";

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

  const tier = tierOf(user);
  const last = await prisma.conversation.findFirst({ where: { userId: user.id, progressKey: key }, orderBy: { updatedAt: "desc" }, select: { nativeLang: true } });
  const nativeLang = last?.nativeLang ?? "français";
  try {
    // Même langue, niveau, thème et langue de l'élève : le paquet est partagé, pas régénéré.
    const r = await cachedJson<Card[]>("deck", [key, progress.level, topic, nativeLang], async () => {
      const usage = await cardsUsage(user.id, user);
      if (over(usage, "decks")) throw new GenerationBlocked(429, "decks_limit");
      if (await budgetBlocks(tier)) throw new GenerationBlocked(503, "budget_paused");
      let cost = 0;
      const cards = await generateDeck({ languageName: progress.languageName, level: progress.level, nativeLang, topic: TOPICS.find((x) => x.id === topic)!.fr,
        onUsage: (model, u) => { cost = Math.round(tokenCostUsd(model, u) * 1e6); void recordUsage({ userId: user.id, tier, kind: "deck", model, usage: u }); } });
      if ("refused" in cards) throw new GenerationBlocked(422, "refused");
      await prisma.usageEvent.create({ data: { userId: user.id, kind: "deck" } });
      return { value: cards, costMicros: cost };
    });
    const cards = r!.value;
    const deck = await prisma.deck.create({ data: { userId: user.id, key, languageName: progress.languageName, level: progress.level, topic, cards } });
    return Response.json({ id: deck.id, cards, cached: r!.hit }, { status: 201 });
  } catch (e) {
    if (e instanceof GenerationBlocked) return jsonError(e.status, e.code, e.code);
    console.error("[decks]", e instanceof ReplyError ? e.code : e);
    return jsonError(502, e instanceof ReplyError ? e.code : "reply_failed", "Échec.");
  }
}
