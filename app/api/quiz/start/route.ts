import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { jsonError, unauthorized } from "@/lib/http";
import { cardsUsage, over } from "@/lib/cards-server";

export async function POST() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const usage = await cardsUsage(user.id, user);
  if (over(usage, "quizzes")) return jsonError(429, "quizzes_limit", "Limite de quiz atteinte.");
  await prisma.usageEvent.create({ data: { userId: user.id, kind: "quiz" } });
  return Response.json({ remaining: usage.pro ? null : usage.limits.quizzes - usage.quizzes - 1 });
}
