import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import type { BrowserContext } from "@playwright/test";

export const db = new PrismaClient({
  datasourceUrl: process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5433/atelier_test",
});

/** Crée un compte et une session directement en base, puis pose le cookie de connexion. */
export async function signIn(context: BrowserContext, opts: { pro?: boolean } = {}) {
  const user = await db.user.create({
    data: {
      email: `e2e-${randomUUID()}@exemple.test`,
      name: "Élève test",
      ...(opts.pro ? { subscriptionStatus: "active", currentPeriodEnd: new Date(Date.now() + 30 * 864e5), stripeCustomerId: `cus_${randomUUID()}` } : {}),
    },
  });
  const sessionToken = randomUUID();
  await db.session.create({ data: { sessionToken, userId: user.id, expires: new Date(Date.now() + 864e5) } });
  await context.addCookies([{ name: "authjs.session-token", value: sessionToken, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  return user;
}
