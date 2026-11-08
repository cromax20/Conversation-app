// Cache partagé des réponses de l'IA : une demande identique n'est calculée qu'une fois.
import { createHash } from "node:crypto";
import { prisma } from "./db";

/** Levée dans `produce` quand une limite empêche de générer (le cache, lui, reste servi). */
export class GenerationBlocked extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export type CacheKind = "deck" | "phrases" | "translate" | "tts";

/** Normalise un texte pour que « Bonjour ! » et « bonjour ! » partagent la même entrée. */
export function normalizeText(s: string): string {
  return s.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function cacheKey(kind: CacheKind, parts: (string | number | boolean | null | undefined)[]): string {
  return createHash("sha256").update(JSON.stringify([kind, ...parts.map((p) => (typeof p === "string" ? normalizeText(p) : p ?? null))])).digest("hex");
}

const disabled = () => process.env.AI_CACHE === "off";

async function touch(key: string) {
  await prisma.aiCache.update({ where: { key }, data: { hits: { increment: 1 }, lastUsedAt: new Date() } }).catch(() => {});
}

/**
 * Renvoie la valeur en cache, sinon la calcule avec `produce` et la garde.
 * `produce` renvoie null pour ne rien mettre en cache (refus, erreur…).
 */
export async function cachedJson<T>(kind: CacheKind, parts: Parameters<typeof cacheKey>[1], produce: () => Promise<{ value: T; costMicros: number } | null>): Promise<{ value: T; hit: boolean } | null> {
  const key = cacheKey(kind, parts);
  if (!disabled()) {
    const found = await prisma.aiCache.findUnique({ where: { key }, select: { value: true } });
    if (found?.value != null) {
      void touch(key);
      return { value: found.value as T, hit: true };
    }
  }
  const made = await produce();
  if (!made) return null;
  if (!disabled()) {
    await prisma.aiCache.upsert({
      where: { key },
      create: { key, kind, value: JSON.parse(JSON.stringify(made.value)), costMicros: made.costMicros },
      update: {},
    }).catch(() => {});
  }
  return { value: made.value, hit: false };
}

const MAX_AUDIO_BYTES = 600_000;

export async function cachedBytes(kind: CacheKind, parts: Parameters<typeof cacheKey>[1], produce: () => Promise<{ bytes: ArrayBuffer; costMicros: number }>): Promise<{ bytes: ArrayBuffer; hit: boolean }> {
  const key = cacheKey(kind, parts);
  if (!disabled()) {
    const found = await prisma.aiCache.findUnique({ where: { key }, select: { bytes: true } });
    if (found?.bytes && found.bytes.length > 0) {
      void touch(key);
      const b = found.bytes;
      return { bytes: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, hit: true };
    }
  }
  const made = await produce();
  if (!disabled() && made.bytes.byteLength > 0 && made.bytes.byteLength <= MAX_AUDIO_BYTES) {
    await prisma.aiCache.upsert({
      where: { key },
      create: { key, kind, bytes: Buffer.from(made.bytes), costMicros: made.costMicros },
      update: {},
    }).catch(() => {});
  }
  return { bytes: made.bytes, hit: false };
}

/** Nettoyage : la voix n'est gardée que si elle a servi récemment ; le texte, plus longtemps. */
export async function purgeCache(now = new Date()) {
  const days = (n: number) => new Date(now.getTime() - n * 86_400_000);
  const [audio, text] = await Promise.all([
    prisma.aiCache.deleteMany({ where: { kind: "tts", lastUsedAt: { lt: days(Number(process.env.CACHE_AUDIO_DAYS) || 45) } } }),
    prisma.aiCache.deleteMany({ where: { kind: { not: "tts" }, lastUsedAt: { lt: days(Number(process.env.CACHE_TEXT_DAYS) || 365) } } }),
  ]);
  return { audio: audio.count, text: text.count };
}

/** Appels évités et argent économisé (dollars) depuis le début. */
export async function cacheSavings() {
  const rows = await prisma.aiCache.groupBy({ by: ["kind"], _sum: { hits: true }, _count: { _all: true } });
  const all = await prisma.aiCache.findMany({ where: { hits: { gt: 0 } }, select: { hits: true, costMicros: true } });
  const savedUsd = all.reduce((a, r) => a + (r.hits * r.costMicros) / 1e6, 0);
  return { byKind: Object.fromEntries(rows.map((r) => [r.kind, { entries: r._count._all, hits: r._sum.hits ?? 0 }])), savedUsd };
}
