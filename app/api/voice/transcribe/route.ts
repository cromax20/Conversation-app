import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { voiceAllowed } from "@/lib/calls-server";
import { transcribe, voiceEnabled } from "@/lib/voice";
import { jsonError, notFound, unauthorized } from "@/lib/http";

export const maxDuration = 60;
const MAX_BYTES = 5 * 1024 * 1024; // ~ quelques minutes d'audio compressé

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!voiceEnabled()) return jsonError(503, "voice_unavailable", "La voix n'est pas configurée.");

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  const conversationId = form?.get("conversationId");
  if (!(audio instanceof Blob) || typeof conversationId !== "string") return jsonError(400, "invalid", "Requête invalide.");
  if (audio.size === 0 || audio.size > MAX_BYTES) return jsonError(413, "too_large", "Enregistrement vide ou trop long.");

  const conv = await prisma.conversation.findFirst({ where: { id: conversationId, userId: user.id } });
  if (!conv) return notFound();
  if (!(await voiceAllowed(user.id, user, conv))) return jsonError(402, "pro_only", "La dictée est réservée aux formules Plus et Premium.");

  try {
    const text = await transcribe({ audio, languageCode: conv.language });
    return Response.json({ text });
  } catch (e) {
    console.error("[voice/transcribe]", e);
    return jsonError(502, "voice_failed", "La transcription a échoué. Réessayez.");
  }
}
