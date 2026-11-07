import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { quotaFor } from "@/lib/plan";
import { generatePhrases, ReplyError } from "@/lib/claude";
import { jsonError, notFound, unauthorized } from "@/lib/http";
import { budgetBlocks, recordUsage } from "@/lib/costs";

export const maxDuration = 60;

// Phrases pour commencer : générées une seule fois par conversation, puis conservées.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const conv = await prisma.conversation.findFirst({ where: { id, userId: user.id } });
  if (!conv || conv.mode === "exam") return notFound();
  if (Array.isArray(conv.phrases)) return Response.json({ phrases: conv.phrases });

  const quota = await quotaFor(user.id, user);
  if (quota.remaining <= 0) return jsonError(429, quota.pro ? "daily_limit_pro" : "daily_limit", "Limite atteinte.");

  if (await budgetBlocks(quota.tier)) return jsonError(503, "budget_paused", "Trop de demande pour le moment. Réessayez plus tard.");

  try {
    const situation = conv.scene === "free" ? "discussion libre : se présenter, parler de soi, de sa famille, de ses goûts, de sa journée" : `${conv.scene} — ${conv.context}`;
    const r = await generatePhrases({ languageName: conv.languageName, level: conv.level, nativeLang: conv.nativeLang, situation,
      onUsage: (model, usage) => void recordUsage({ userId: user.id, tier: quota.tier, kind: "phrases", model, usage }) });
    if ("refused" in r) return jsonError(422, "refused", "Refusé.");
    // Une seule génération par conversation : elle ne compte pas dans les réponses du jour.
    await prisma.conversation.update({ where: { id }, data: { phrases: r } });
    return Response.json({ phrases: r });
  } catch (e) {
    console.error("[phrases]", e instanceof ReplyError ? e.code : e);
    return jsonError(502, e instanceof ReplyError ? e.code : "reply_failed", "Échec.");
  }
}
