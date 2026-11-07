import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { isPro } from "@/lib/plan";
import { synthesize, voiceEnabled } from "@/lib/voice";

import { jsonError, notFound, unauthorized } from "@/lib/http";

export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!isPro(user)) return jsonError(402, "pro_only", "La voix est réservée aux abonnés.");
  if (!voiceEnabled()) return jsonError(503, "voice_unavailable", "La voix n'est pas configurée.");

  const parsed = z.object({ messageId: z.string() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid", "Requête invalide.");

  const msg = await prisma.message.findFirst({
    where: { id: parsed.data.messageId, role: "assistant", conversation: { userId: user.id } },
    include: { conversation: true },
  });
  if (!msg) return notFound();

  try {
    const audio = await synthesize({
      text: msg.text,
      characterName: (msg.conversation.character as { name?: string }).name || msg.conversation.id,
      languageFr: msg.conversation.languageName,
      level: msg.conversation.level,
    });
    return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" } });
  } catch (e) {
    console.error("[voice/speak]", e);
    return jsonError(502, "voice_failed", "La lecture a échoué. Réessayez.");
  }
}
