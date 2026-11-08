// Adresse de la base : DATABASE_URL / DIRECT_URL, sinon les noms créés par l'intégration Vercel × Neon
// (avec ou sans préfixe, par ex. DIRECT_DATABASE_URL). Les valeurs vides sont ignorées.
type Env = Record<string, string | undefined>;

const POOLED = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"];
const DIRECT = ["DIRECT_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"];

function first(env: Env, names: string[]): string | undefined {
  for (const n of names) {
    const v = env[n]?.trim();
    if (v) return v;
  }
  // Variables préfixées par l'intégration (ex. DIRECT_DATABASE_URL_UNPOOLED).
  for (const n of names) {
    const key = Object.keys(env).find((k) => k !== n && k.endsWith(`_${n}`) && env[k]?.trim());
    if (key) return env[key]!.trim();
  }
  return undefined;
}

export function resolveDatabaseUrl(env: Env = process.env): string | undefined {
  return first(env, POOLED) ?? first(env, DIRECT);
}

export function resolveDirectUrl(env: Env = process.env): string | undefined {
  return first(env, DIRECT) ?? first(env, POOLED);
}
