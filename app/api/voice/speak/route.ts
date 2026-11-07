import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { features, tierOf } from "@/lib/plan";
import { freeCallUnlocked } from "@/lib/calls";
import { voiceAllowed } from "@/lib/calls-server";
import { TTS_USD_PER_CHAR, budgetBlocks, recordUsage } from "@/lib/costs";
import { synthesize, voiceEnabled } from "@/lib/voice";

import { jsonError, notFound, unauthorized } from "@/lib/http";

export const maxDuration = 60;
const PREVIEW_TEXT = "Bonjour ! Voici ma voix. Hello! This is my voice.";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const pro = features(tierOf(user)).voice;
  if (!voiceEnabled()) return jsonError(503, "voice_unavailable", "La voix n'est pas configurée.");

  const parsed = z.object({ messageId: z.string().optional(), preview: z.object({ voice: z.string(), language: z.string() }).optional() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.messageId && !parsed.data.preview)) return jsonError(400, "invalid", "Requête invalide.");

  const tier = tierOf(user);
  if (await budgetBlocks(tier)) return jsonError(503, "budget_paused", "Trop de demande pour le moment. Réessayez plus tard.");

  // Aperçu d'une voix lors de la création d'un interlocuteur.
  if (parsed.data.preview) {
    if (!pro) {
      const progress = await prisma.languageProgress.findMany({ where: { userId: user.id } });
      if (!progress.some((p) => freeCallUnlocked(p))) return jsonError(402, "pro_only", "La voix est réservée aux abonnés.");
    }
    try {
      void recordUsage({ userId: user.id, tier, kind: "tts", model: "gpt-4o-mini-tts", usd: PREVIEW_TEXT.length * TTS_USD_PER_CHAR });
      const audio = await synthesize({ text: PREVIEW_TEXT, characterName: "", languageFr: parsed.data.preview.language.slice(0, 60), level: "B1", voice: parsed.data.preview.voice });
      return new Response(audio, { headers: { "Content-Type": "audio/mpeg" } });
    } catch (e) {
      console.error("[voice/preview]", e);
      return jsonError(502, "voice_failed", "La lecture a échoué. Réessayez.");
    }
  }

  const msg = await prisma.message.findFirst({
    where: { id: parsed.data.messageId!, role: "assistant", conversation: { userId: user.id } },
    include: { conversation: true },
  });
  if (!msg) return notFound();
  // Sans formule avec voix, seulement pendant un appel gratuit encore ouvert.
  if (!(await voiceAllowed(user.id, user, msg.conversation))) return jsonError(402, "pro_only", "La voix est réservée aux formules Plus et Premium.");

  try {
    void recordUsage({ userId: user.id, tier, kind: "tts", model: "gpt-4o-mini-tts", usd: Math.min(4000, msg.text.length) * TTS_USD_PER_CHAR });
    const audio = await synthesize({
      text: msg.text,
      characterName: (msg.conversation.character as { name?: string }).name || msg.conversation.id,
      languageFr: msg.conversation.languageName,
      level: msg.conversation.level,
      voice: (msg.conversation.character as { avatar?: { voice?: string } }).avatar?.voice,
    });
    return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" } });
  } catch (e) {
    console.error("[voice/speak]", e);
    return jsonError(502, "voice_failed", "La lecture a échoué. Réessayez.");
  }
}
