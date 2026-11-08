import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { quotaFor } from "@/lib/plan";
import { generatePhrases, ReplyError } from "@/lib/claude";
import { jsonError, notFound, unauthorized } from "@/lib/http";
import { budgetBlocks, recordUsage, tokenCostUsd } from "@/lib/costs";
import { GenerationBlocked, cachedJson } from "@/lib/ai-cache";
import type { Phrase } from "@/lib/claude";

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
  const situation = conv.scene === "free" ? "discussion libre : se présenter, parler de soi, de sa famille, de ses goûts, de sa journée" : `${conv.scene} — ${conv.context}`;
  // Situation prédéfinie ou discussion libre : les mêmes phrases servent à tous les élèves.
  const situationKey = conv.scene === "free" ? "free" : conv.sceneIndex != null ? `scene:${conv.sceneIndex}` : `ctx:${conv.context}`;

  try {
    const r = await cachedJson<Phrase[]>("phrases", [conv.progressKey, conv.level, conv.nativeLang, situationKey], async () => {
      if (quota.remaining <= 0) throw new GenerationBlocked(429, quota.pro ? "daily_limit_pro" : "daily_limit");
      if (await budgetBlocks(quota.tier)) throw new GenerationBlocked(503, "budget_paused");
      let cost = 0;
      const out = await generatePhrases({ languageName: conv.languageName, level: conv.level, nativeLang: conv.nativeLang, situation,
        onUsage: (model, u) => { cost = Math.round(tokenCostUsd(model, u) * 1e6); void recordUsage({ userId: user.id, tier: quota.tier, kind: "phrases", model, usage: u }); } });
      if ("refused" in out) throw new GenerationBlocked(422, "refused");
      return { value: out, costMicros: cost };
    });
    // Gardées sur la conversation : un seul calcul par conversation, et aucun si déjà en cache.
    await prisma.conversation.update({ where: { id }, data: { phrases: r!.value } });
    return Response.json({ phrases: r!.value, cached: r!.hit });
  } catch (e) {
    if (e instanceof GenerationBlocked) return jsonError(e.status, e.code, e.code);
    console.error("[phrases]", e instanceof ReplyError ? e.code : e);
    return jsonError(502, e instanceof ReplyError ? e.code : "reply_failed", "Échec.");
  }
}
