import { defineConfig } from "@playwright/test";

// Base de test dédiée. Les réponses de Claude et la voix sont simulées (MOCK_AI=1) : aucun appel payant.
const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5433/atelier_test";
export const PORT = 3100;

const env = {
  DATABASE_URL: TEST_DB,
  DIRECT_URL: TEST_DB,
  AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-123",
  APP_URL: `http://localhost:${PORT}`,
  MOCK_AI: "1",
  E2E: "1",
  FREE_DAILY_REPLIES: "4",
  FREE_DAILY_CARDS: "3",
  FREE_DAILY_QUIZZES: "1",
  FREE_DAILY_DECKS: "1",
  STRIPE_SECRET_KEY: "sk_test_e2e",
  STRIPE_WEBHOOK_SECRET: "whsec_e2e_secret",
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: `http://localhost:${PORT}`, locale: "fr-FR" },
  webServer: {
    command: `npx prisma migrate deploy && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: false,
    env,
  },
  metadata: { env },
});
