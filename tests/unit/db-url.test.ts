import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl, resolveDirectUrl } from "@/lib/db-url";

describe("adresse de la base", () => {
  it("utilise DATABASE_URL et DIRECT_URL quand ils sont remplis", () => {
    const env = { DATABASE_URL: "postgres://pool", DIRECT_URL: "postgres://direct" };
    expect(resolveDatabaseUrl(env)).toBe("postgres://pool");
    expect(resolveDirectUrl(env)).toBe("postgres://direct");
  });
  it("ignore les variables vides et reprend les noms de l'intégration Neon", () => {
    const env = { DATABASE_URL: "", DIRECT_URL: " ", DATABASE_URL_UNPOOLED: "postgres://u", POSTGRES_PRISMA_URL: "postgres://p" };
    expect(resolveDatabaseUrl(env)).toBe("postgres://p");
    expect(resolveDirectUrl(env)).toBe("postgres://u");
  });
  it("gère les variables préfixées (ex. DIRECT_DATABASE_URL)", () => {
    const env = { DATABASE_URL: "", DIRECT_URL: "", DIRECT_DATABASE_URL: "postgres://pool", DIRECT_DATABASE_URL_UNPOOLED: "postgres://direct" };
    expect(resolveDatabaseUrl(env)).toBe("postgres://pool");
    expect(resolveDirectUrl(env)).toBe("postgres://direct");
  });
  it("ne renvoie rien sans aucune base", () => {
    expect(resolveDatabaseUrl({})).toBeUndefined();
  });
});
