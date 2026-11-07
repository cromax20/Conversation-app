import { prisma } from "./db";
import { features, tierOf, startOfUtcDay, type PlanUser } from "./plan";
import { limits } from "./cards";

export type CardsUsage = { pro: boolean; cards: number; quizzes: number; decks: number; limits: ReturnType<typeof limits> };

/** Cartes révisées, quiz et paquets créés aujourd'hui (comptés seulement sans abonnement). */
export async function cardsUsage(userId: string, user: PlanUser): Promise<CardsUsage> {
  const since = startOfUtcDay();
  const count = (kind: string) => prisma.usageEvent.count({ where: { userId, kind, createdAt: { gte: since } } });
  const [cards, quizzes, decks] = await Promise.all([count("card"), count("quiz"), count("deck")]);
  return { pro: features(tierOf(user)).unlimitedCards, cards, quizzes, decks, limits: limits() };
}

export function over(u: CardsUsage, kind: "cards" | "quizzes" | "decks") {
  return !u.pro && u[kind] >= u.limits[kind];
}
