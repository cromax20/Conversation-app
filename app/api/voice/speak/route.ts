import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { features, tierOf } from "@/lib/plan";
import { freeCallUnlocked } from "@/lib/calls";
import { voiceAllowed } from "@/lib/calls-server";
import { TTS_USD_PER_CHAR, budgetBlocks, recordUsage } from "@/lib/costs";
import { isSlowLevel, resolveVoice, synthesize, voiceEnabled } from "@/lib/voice";
import { GenerationBlocked, cachedBytes } from "@/lib/ai-cache";

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

  // Un même texte, avec la même voix, la même langue et le même débit, n'est synthétisé qu'une fois.
  const speak = async (o: { text: string; characterName: string; languageFr: string; level: string; voice?: string }) => {
    const voice = resolveVoice(o.characterName, o.voice);
    return cachedBytes("tts", [voice, o.languageFr, isSlowLevel(o.level), o.text], async () => {
      if (await budgetBlocks(tier)) throw new GenerationBlocked(503, "budget_paused");
      const usd = Math.min(4000, o.text.length) * TTS_USD_PER_CHAR;
      void recordUsage({ userId: user.id, tier, kind: "tts", model: "gpt-4o-mini-tts", usd });
      return { bytes: await synthesize({ ...o, voice }), costMicros: Math.round(usd * 1e6) };
    });
  };
  const fail = (e: unknown) => e instanceof GenerationBlocked ? jsonError(e.status, e.code, e.code) : jsonError(502, "voice_failed", "La lecture a échoué. Réessayez.");

  // Aperçu d'une voix lors de la création d'un interlocuteur.
  if (parsed.data.preview) {
    if (!pro) {
      const progress = await prisma.languageProgress.findMany({ where: { userId: user.id } });
      if (!progress.some((p) => freeCallUnlocked(p))) return jsonError(402, "pro_only", "La voix est réservée aux abonnés.");
    }
    try {
      const { bytes, hit } = await speak({ text: PREVIEW_TEXT, characterName: "", languageFr: parsed.data.preview.language.slice(0, 60), level: "B1", voice: parsed.data.preview.voice });
      return new Response(bytes, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=604800", "X-Cache": hit ? "HIT" : "MISS" } });
    } catch (e) {
      if (!(e instanceof GenerationBlocked)) console.error("[voice/preview]", e);
      return fail(e);
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
    const { bytes, hit } = await speak({
      text: msg.text,
      characterName: (msg.conversation.character as { name?: string }).name || msg.conversation.id,
      languageFr: msg.conversation.languageName,
      level: msg.conversation.level,
      voice: (msg.conversation.character as { avatar?: { voice?: string } }).avatar?.voice,
    });
    return new Response(bytes, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=604800", "X-Cache": hit ? "HIT" : "MISS" } });
  } catch (e) {
    if (!(e instanceof GenerationBlocked)) console.error("[voice/speak]", e);
    return fail(e);
  }
}
