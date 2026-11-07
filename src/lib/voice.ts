import OpenAI, { toFile } from "openai";

// Voix premium : synthèse (lecture des répliques) et transcription (dictée).
const TTS_MODEL = "gpt-4o-mini-tts";
const STT_MODEL = "gpt-4o-mini-transcribe";

// Codes que la transcription accepte comme indice de langue (ISO 639-1).
const STT_LANG_HINT = new Set(["en", "zh", "hi", "es", "ar", "fr", "bn", "pt", "ru", "id", "ur", "de", "ja", "mr", "vi", "te", "ha", "tr", "ta"]);

// Voix stable par personnage (même prénom → même voix).
export const VOICES = ["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"] as const;

export function voiceFor(name: string): (typeof VOICES)[number] {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return VOICES[h % VOICES.length];
}

let client: OpenAI | null = null;
function getClient() {
  client ??= new OpenAI();
  return client;
}

export const voiceEnabled = () => Boolean(process.env.OPENAI_API_KEY) || process.env.MOCK_AI === "1";

export async function synthesize(opts: { text: string; characterName: string; languageFr: string; level: string; voice?: string }): Promise<ArrayBuffer> {
  if (process.env.MOCK_AI === "1") return new ArrayBuffer(0);
  const slow = opts.level === "A1" || opts.level === "A2";
  const res = await getClient().audio.speech.create({
    model: TTS_MODEL,
    voice: (opts.voice && (VOICES as readonly string[]).includes(opts.voice) ? opts.voice : voiceFor(opts.characterName)) as (typeof VOICES)[number],
    input: opts.text.slice(0, 4000),
    instructions: `Parle en ${opts.languageFr} avec l'accent et la prononciation locale authentiques, sur un ton naturel et chaleureux${slow ? ", lentement et en articulant bien, pour un apprenant débutant" : ""}. Les transcriptions phonétiques entre parenthèses peuvent être lues plus bas ou ignorées.`,
    response_format: "mp3",
  });
  return res.arrayBuffer();
}

export async function transcribe(opts: { audio: Blob; languageCode: string }): Promise<string> {
  if (process.env.MOCK_AI === "1") return "Bonjour, ceci est une dictée simulée.";
  const ext = opts.audio.type.includes("mp4") ? "mp4" : opts.audio.type.includes("ogg") ? "ogg" : "webm";
  const file = await toFile(opts.audio, `dictee.${ext}`, { type: opts.audio.type || "audio/webm" });
  const res = await getClient().audio.transcriptions.create({
    model: STT_MODEL,
    file,
    ...(STT_LANG_HINT.has(opts.languageCode.split("-")[0]) ? { language: opts.languageCode.split("-")[0] } : {}),
  });
  return res.text.trim();
}
