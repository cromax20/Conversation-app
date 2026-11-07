import { test } from "@playwright/test";
import { signIn } from "./helpers";

// Captures d'écran pour vérification visuelle (téléphone), seulement si SCREENSHOTS=1.
test.skip(!process.env.SCREENSHOTS, "captures désactivées");
test.use({ viewport: { width: 390, height: 844 } });

test("captures", async ({ page, context }) => {
  const dir = process.env.SCREENSHOTS!;
  await signIn(context, { pro: true });
  await page.goto("/");
  await page.screenshot({ path: `${dir}/home.png`, fullPage: true });
  await page.getByRole("button", { name: "Commencer la conversation" }).click();
  await page.locator(".msg.ai").first().waitFor();
  await page.getByPlaceholder("Votre réponse…").fill("Hello, I would like a coffee please");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await page.getByTestId("toast").waitFor();
  await page.screenshot({ path: `${dir}/chat.png`, fullPage: true });
  await page.goto("/progression");
  await page.screenshot({ path: `${dir}/progression.png`, fullPage: true });
  await page.goto("/abonnement");
  await page.screenshot({ path: `${dir}/abonnement.png`, fullPage: true });
});
