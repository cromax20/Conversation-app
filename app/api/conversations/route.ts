import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { jsonError, unauthorized } from "@/lib/http";
import { nativeFrenchName } from "@/i18n";
import {
  LEVEL_ORDER, MAX_CONTEXT_LENGTH, MAX_FIELD_LENGTH, NATIVE_CODES, SCENES, buildSystemPrompt, conversationTitle,
  describeScene, isValidSetup, languageName, progressKey, type ConversationSetup,
} from "@/lib/characters";

const Body = z.object({
  language: z.string().max(20),
  customLanguage: z.string().max(MAX_FIELD_LENGTH).optional(),
  level: z.enum(LEVEL_ORDER as [string, ...string[]]),
  nativeLang: z.string().refine((v) => NATIVE_CODES.includes(v)), // code, ex. "fr"
  sceneIndex: z.number().int().min(0).max(SCENES.length - 1).nullable(),
  context: z.string().max(MAX_CONTEXT_LENGTH),
  freeTalk: z.boolean().optional(),
  character: z.object({
    name: z.string().trim(), age: z.number().int(), city: z.string().trim(), job: z.string(), trait: z.string(), hobby: z.string(),
  }),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid", "Réglages invalides.");
  const setup = { ...parsed.data, nativeLang: nativeFrenchName(parsed.data.nativeLang) } as ConversationSetup;
  if (!isValidSetup(setup)) return jsonError(400, "invalid", "Langue ou personnage invalide.");
  if (!setup.context.trim() && !setup.freeTalk && setup.sceneIndex === null) return jsonError(400, "invalid", "Choisissez une situation.");

  const scene = describeScene(setup);
  const name = languageName(setup);
  const key = progressKey(setup);

  // Première pratique de cette langue : la progression démarre au niveau choisi.
  await prisma.languageProgress.upsert({
    where: { userId_key: { userId: user.id, key } },
    create: { userId: user.id, key, languageName: name, level: setup.level, startLevel: setup.level },
    update: {},
  });

  const conv = await prisma.conversation.create({
    data: {
      userId: user.id,
      title: conversationTitle(setup),
      language: setup.language,
      languageName: name,
      progressKey: key,
      level: setup.level,
      nativeLang: setup.nativeLang,
      scene: !setup.context.trim() && setup.freeTalk ? "free" : scene.title,
      sceneIndex: setup.context.trim() || setup.freeTalk ? null : setup.sceneIndex,
      context: scene.description,
      character: setup.character,
      systemPrompt: buildSystemPrompt(setup),
    },
  });
  return NextResponse.json({ id: conv.id }, { status: 201 });
}
