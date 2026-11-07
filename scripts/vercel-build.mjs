// Construction sur Vercel : retrouve l'adresse de la base (voir src/lib/db-url.ts),
// applique les migrations, puis construit le site.
import { spawnSync } from "node:child_process";

const POOLED = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"];
const DIRECT = ["DIRECT_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"];
const env = process.env;
const first = (names) => {
  for (const n of names) if (env[n]?.trim()) return env[n].trim();
  for (const n of names) {
    const k = Object.keys(env).find((x) => x !== n && x.endsWith(`_${n}`) && env[x]?.trim());
    if (k) return env[k].trim();
  }
  return undefined;
};
const pooled = first(POOLED) ?? first(DIRECT);
const direct = first(DIRECT) ?? first(POOLED);
if (!pooled || !direct) {
  console.error("Aucune adresse de base de données trouvée : ajoutez DATABASE_URL et DIRECT_URL, ou reliez une base Neon au projet.");
  process.exit(1);
}
const childEnv = { ...env, DATABASE_URL: pooled, DIRECT_URL: direct };
for (const cmd of [["prisma", "generate"], ["prisma", "migrate", "deploy"], ["next", "build"]]) {
  const r = spawnSync("npx", cmd, { stdio: "inherit", env: childEnv });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
