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
  await page.goto("/parcours");
  await page.screenshot({ path: `${dir}/parcours.png`, fullPage: true });
  await page.goto("/appel/nouveau");
  await page.screenshot({ path: `${dir}/appel-setup.png`, fullPage: true });
  await page.getByLabel("Coiffure").selectOption("curly");
  await page.getByLabel("Barbe").selectOption("full");
  await page.getByRole("button", { name: /Appeler/ }).click();
  await page.getByRole("button", { name: "Appeler" }).click();
  await page.getByTestId("subtitle").waitFor();
  await page.screenshot({ path: `${dir}/appel.png` });
  await page.getByLabel("Langue du site").selectOption("ar");
  await page.waitForTimeout(800);
  await page.goto("/parcours");
  await page.screenshot({ path: `${dir}/parcours-ar.png`, fullPage: true });
  await page.goto("/abonnement");
  await page.screenshot({ path: `${dir}/abonnement.png`, fullPage: true });
});
