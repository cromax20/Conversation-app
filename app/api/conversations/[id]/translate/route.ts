import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { quotaFor } from "@/lib/plan";
import { translate, ReplyError } from "@/lib/claude";
import { jsonError, notFound, unauthorized } from "@/lib/http";
import { budgetBlocks, recordUsage } from "@/lib/costs";

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
  if (quota.remaining <= 0) return jsonError(429, quota.pro ? "daily_limit_pro" : "daily_limit", "Limite atteinte.");

  if (await budgetBlocks(quota.tier)) return jsonError(503, "budget_paused", "Trop de demande pour le moment. Réessayez plus tard.");

  try {
    const r = await translate({ ...parsed.data, languageName: conv.languageName, level: conv.level, nativeLang: conv.nativeLang,
      onUsage: (model, usage) => void recordUsage({ userId: user.id, tier: quota.tier, kind: "translate", model, usage }) });
    if ("refused" in r) return jsonError(422, "refused", "Refusé.");
    await prisma.usageEvent.create({ data: { userId: user.id, kind: "translate" } });
    return Response.json({ ...r, remaining: quota.remaining - 1 });
  } catch (e) {
    console.error("[translate]", e instanceof ReplyError ? e.code : e);
    return jsonError(502, e instanceof ReplyError ? e.code : "reply_failed", "Échec.");
  }
}
