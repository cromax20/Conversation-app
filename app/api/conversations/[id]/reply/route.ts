import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { quotaFor } from "@/lib/plan";
import { streamReply, ReplyError } from "@/lib/claude";
import { jsonError, notFound, unauthorized } from "@/lib/http";
import { awardPractice } from "@/lib/progress-server";
import { splitExpression } from "@/lib/characters";
import { freeCallActive } from "@/lib/calls";

export const maxDuration = 60;

const Body = z.object({ text: z.string().trim().min(1).max(1000).optional() });

// Flux NDJSON : {"t":"delta","text":…} … puis {"t":"done",…} ou {"t":"error","code":…}
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError(400, "invalid", "Message invalide (1 000 caractères maximum).");
  const text = parsed.data.text;

  const conv = await prisma.conversation.findFirst({ where: { id, userId: user.id } });
  if (!conv) return notFound();

  const quota = await quotaFor(user.id, user);
  if (quota.remaining <= 0) {
    return jsonError(429, quota.pro ? "daily_limit_pro" : "daily_limit", quota.pro
      ? "Limite quotidienne atteinte. Elle se réinitialise à minuit (UTC)."
      : "Vous avez utilisé vos réponses gratuites du jour. Passez à l'abonnement pour continuer.");
  }

  if (conv.examResult) return jsonError(409, "exam_finished", "Cette épreuve est terminée.");

  // Appel gratuit hebdomadaire : fermé une fois sa durée écoulée.
  if (conv.mode === "call" && !quota.features.calls && !freeCallActive(conv)) {
    return jsonError(403, "call_time_up", "L'appel gratuit est terminé.");
  }

  const prior = await prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" } });
  // Sans nouveau texte, on ne relance que l'ouverture ou une réponse restée en échec.
  if (!text && prior.length > 0 && prior[prior.length - 1].role !== "user") {
    return jsonError(409, "nothing_to_answer", "Écrivez un message.");
  }

  let userMessageId: string | null = null;
  if (text) {
    const m = await prisma.message.create({ data: { conversationId: id, role: "user", text } });
    userMessageId = m.id;
    prior.push(m);
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const result = await streamReply({
          model: quota.features.model,
          system: conv.systemPrompt,
          history: prior,
          onText: (delta) => send({ t: "delta", text: delta }),
          signal: req.signal,
        });
        if (result.kind === "refused") {
          send({ t: "error", code: "refused", userMessageId });
        } else {
          // En appel vidéo, la réplique commence par une balise d'expression (« [sourire] … »).
          const { expression, text: spoken } = conv.mode === "call" ? splitExpression(result.text) : { expression: null, text: result.text };
          const saved = await prisma.message.create({
            data: { conversationId: id, role: "assistant", text: spoken, content: JSON.parse(JSON.stringify(result.content)) },
          });
          await prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
          const reward = text && conv.mode !== "exam" ? await awardPractice(user.id, conv.progressKey, text) : null;
          send({ t: "done", id: saved.id, text: spoken, expression, userMessageId, remaining: quota.remaining - 1, limit: quota.limit, reward });
        }
      } catch (e) {
        if (!req.signal.aborted) {
          const code = e instanceof ReplyError ? e.code : "unknown";
          console.error("[reply]", code, e instanceof Error ? e.message : e);
          send({ t: "error", code, userMessageId });
        }
      } finally {
        try { controller.close(); } catch {}
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
