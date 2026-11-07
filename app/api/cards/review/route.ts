import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { jsonError, notFound, unauthorized } from "@/lib/http";
import { nextReview } from "@/lib/cards";
import { cardsUsage, over } from "@/lib/cards-server";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = z.object({ deckId: z.string(), index: z.number().int().min(0).max(49), known: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid", "Requête invalide.");
  const { deckId, index, known } = parsed.data;

  const deck = await prisma.deck.findFirst({ where: { id: deckId, userId: user.id } });
  if (!deck || !Array.isArray(deck.cards) || index >= deck.cards.length) return notFound();

  const usage = await cardsUsage(user.id, user);
  if (over(usage, "cards")) return jsonError(429, "cards_limit", "Limite de cartes atteinte.");

  const prev = await prisma.cardReview.findUnique({ where: { deckId_index: { deckId, index } } });
  const next = nextReview(prev?.box ?? 1, known);
  await prisma.$transaction([
    prisma.cardReview.upsert({ where: { deckId_index: { deckId, index } }, create: { deckId, index, ...next }, update: next }),
    prisma.usageEvent.create({ data: { userId: user.id, kind: "card" } }),
  ]);
  return Response.json({ box: next.box, remaining: usage.pro ? null : usage.limits.cards - usage.cards - 1 });
}
