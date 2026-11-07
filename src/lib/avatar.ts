// Apparence de l'interlocuteur·rice des appels vidéo (illustration animée).

export const SKIN_TONES = ["#f7dcc4", "#eec1a0", "#d9a27b", "#b9784f", "#8d5a3a", "#5c3a24"];
export const HAIR_STYLES = ["short", "long", "curly", "bun", "afro", "braids", "shaved", "headscarf"] as const;
export const HAIR_COLORS = { black: "#1d1a19", brown: "#3d2618", chestnut: "#6b4226", blond: "#d9b26a", red: "#a8462a", grey: "#9a9a9a", white: "#e8e6e1" } as const;
export const EYE_COLORS = { brown: "#5a3a22", dark: "#21160f", hazel: "#7d5b2d", green: "#4f7a4a", blue: "#4a76a8", grey: "#77818a" } as const;
export const BEARDS = ["none", "stubble", "full", "moustache"] as const;
export const OUTFITS = ["#2a4fbf", "#c8412e", "#1f7a4d", "#7a3fb0", "#e0a43a", "#2b2f3a", "#e8e6e1", "#0f8a8a"];
export const SCENERIES = ["country", "mountains", "sea", "desert", "city", "countryside", "tropical", "snow", "village"] as const;
export const TIMES = ["morning", "day", "sunset", "night"] as const;
export const VOICES = ["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"] as const;
export const HEADSCARF_COLORS = ["#7a3fb0", "#1f7a4d", "#c8412e", "#2a4fbf", "#e0a43a", "#2b2f3a"];

export type Avatar = {
  skin: number; // index dans SKIN_TONES
  hairStyle: (typeof HAIR_STYLES)[number];
  hairColor: keyof typeof HAIR_COLORS;
  eyes: keyof typeof EYE_COLORS;
  beard: (typeof BEARDS)[number];
  glasses: boolean;
  earrings: boolean;
  outfit: number; // index dans OUTFITS
  scenery: (typeof SCENERIES)[number];
  time: (typeof TIMES)[number];
  voice: (typeof VOICES)[number];
};

export const DEFAULT_AVATAR: Avatar = {
  skin: 2, hairStyle: "short", hairColor: "brown", eyes: "brown", beard: "none", glasses: false, earrings: false,
  outfit: 0, scenery: "country", time: "day", voice: "coral",
};

export function defaultSceneryFor(region: string | undefined): Exclude<Avatar["scenery"], "country"> {
  switch (region) {
    case "Afrique": return "desert";
    case "Asie": return "mountains";
    case "Amériques": return "tropical";
    case "Océanie": return "sea";
    case "Europe": return "countryside";
    default: return "city";
  }
}

const oneOf = <T extends readonly string[]>(list: T, v: unknown): v is T[number] => typeof v === "string" && (list as readonly string[]).includes(v);

/** Vérifie une apparence envoyée par le navigateur. */
export function parseAvatar(v: unknown): Avatar | null {
  if (!v || typeof v !== "object") return null;
  const a = v as Record<string, unknown>;
  const ok =
    Number.isInteger(a.skin) && (a.skin as number) >= 0 && (a.skin as number) < SKIN_TONES.length &&
    oneOf(HAIR_STYLES, a.hairStyle) && oneOf(Object.keys(HAIR_COLORS), a.hairColor) && oneOf(Object.keys(EYE_COLORS), a.eyes) &&
    oneOf(BEARDS, a.beard) && typeof a.glasses === "boolean" && typeof a.earrings === "boolean" &&
    Number.isInteger(a.outfit) && (a.outfit as number) >= 0 && (a.outfit as number) < OUTFITS.length &&
    oneOf(SCENERIES, a.scenery) && oneOf(TIMES, a.time) && oneOf(VOICES, a.voice);
  return ok ? (a as unknown as Avatar) : null;
}

/** Apparence stable tirée d'une graine (ex. prénom + ville) pour les personnages des conversations. */
export function avatarFromSeed(seed: string): Avatar {
  let h = 2166136261;
  for (const ch of seed) { h ^= ch.codePointAt(0)!; h = Math.imul(h, 16777619) >>> 0; }
  const pick = <T,>(list: readonly T[], shift: number) => list[(h >>> shift) % list.length];
  const styles = HAIR_STYLES.filter((s) => s !== "headscarf");
  const beardRoll = (h >>> 20) % 5;
  return {
    skin: (h >>> 1) % SKIN_TONES.length,
    hairStyle: pick(styles, 4),
    hairColor: pick(["black", "brown", "chestnut", "blond", "red", "grey"] as const, 8),
    eyes: pick(Object.keys(EYE_COLORS) as (keyof typeof EYE_COLORS)[], 12),
    beard: beardRoll === 0 ? "stubble" : beardRoll === 1 ? "moustache" : "none",
    glasses: (h >>> 16) % 4 === 0,
    earrings: (h >>> 18) % 3 === 0,
    outfit: (h >>> 22) % OUTFITS.length,
    scenery: "country",
    time: "day",
    voice: pick(VOICES, 26),
  };
}
