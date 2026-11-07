export default async function globalSetup() {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5433/atelier_test";
}
