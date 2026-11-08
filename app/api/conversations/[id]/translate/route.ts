import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { quotaFor } from "@/lib/plan";
import { translate, ReplyError } from "@/lib/claude";
import { jsonError, notFound, unauthorized } from "@/lib/http";
import { budgetBlocks, recordUsage, tokenCostUsd } from "@/lib/costs";
import { GenerationBlocked, cachedJson } from "@/lib/ai-cache";
import type { Translation } from "@/lib/claude";

export const maxDuration = 60;

const Body = z.object({ text: z.string().trim().min(1).max(500), direction: z.enum(["toTarget", "toNative"]) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid", "Texte invalide.");

  const conv = await prisma.conversation.findFirst({ where: { id, userId: user.id } });
  // Pas de traduction pendant une épreuve de passage.
  if (!conv || conv.mode === "exam") return notFound();

  const quota = await quotaFor(user.id, user);

  try {
    // Phrase déjà traduite (dans ce sens, cette langue, ce niveau) : réutilisée, gratuite et hors quota.
    const r = await cachedJson<Translation>("translate", [parsed.data.direction, conv.progressKey, conv.level, conv.nativeLang, parsed.data.text], async () => {
      if (quota.remaining <= 0) throw new GenerationBlocked(429, quota.pro ? "daily_limit_pro" : "daily_limit");
      if (await budgetBlocks(quota.tier)) throw new GenerationBlocked(503, "budget_paused");
      let cost = 0;
      const out = await translate({ ...parsed.data, languageName: conv.languageName, level: conv.level, nativeLang: conv.nativeLang,
        onUsage: (model, u) => { cost = Math.round(tokenCostUsd(model, u) * 1e6); void recordUsage({ userId: user.id, tier: quota.tier, kind: "translate", model, usage: u }); } });
      if ("refused" in out) throw new GenerationBlocked(422, "refused");
      await prisma.usageEvent.create({ data: { userId: user.id, kind: "translate" } });
      return { value: out, costMicros: cost };
    });
    return Response.json({ ...r!.value, cached: r!.hit, remaining: r!.hit ? quota.remaining : quota.remaining - 1 });
  } catch (e) {
    if (e instanceof GenerationBlocked) return jsonError(e.status, e.code, e.code);
    console.error("[translate]", e instanceof ReplyError ? e.code : e);
    return jsonError(502, e instanceof ReplyError ? e.code : "reply_failed", "Échec.");
  }
}
