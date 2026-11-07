import { expect, test } from "@playwright/test";
import Stripe from "stripe";
import { db, signIn } from "./helpers";

test.afterAll(async () => { await db.$disconnect(); });

test("un visiteur voit le générateur et doit se connecter pour discuter", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Atelier de personnages" })).toBeVisible();
  await expect(page.locator(".who")).toContainText("ans");
  await page.getByRole("button", { name: "Se connecter pour commencer" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: "Recevoir un lien de connexion" })).toBeVisible();
});

test("conversation complète : ouverture, réponse, XP, historique", async ({ page, context }) => {
  await signIn(context);
  await page.goto("/");
  await page.getByLabel("Langue ou dialecte").selectOption({ label: "Kabyle · Taqbaylit" });
  await page.getByRole("button", { name: "Au café" }).click();
  await page.getByRole("button", { name: "Commencer la conversation" }).click();

  await expect(page).toHaveURL(/\/c\//);
  await expect(page.locator(".msg.ai").first()).toContainText("Bonjour !");
  await page.getByPlaceholder("Votre réponse…").fill("Azul, ad sweɣ aqahwi");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.locator(".msg.me")).toContainText("Azul");
  await expect(page.locator(".msg.ai").nth(1)).toContainText("Réponse simulée");
  await expect(page.getByTestId("toast")).toContainText("+9 XP");
  await expect(page.getByTestId("remaining")).toContainText("2 réponses restantes");

  // Sans abonnement : pas de voix, mais un lien vers l'abonnement.
  await expect(page.getByRole("button", { name: "Dicter votre réponse" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Voix et dictée/ })).toBeVisible();

  // L'historique est conservé.
  await page.reload();
  await expect(page.locator(".msg")).toHaveCount(3);
  await page.goto("/conversations");
  await expect(page.getByRole("link", { name: /Kabyle/ })).toBeVisible();
  await page.goto("/progression");
  await expect(page.getByTestId("progress-card")).toContainText("Kabyle");
  await expect(page.getByTestId("progress-card")).toContainText("Palier 1/3");
});

test("langue libre et personnage personnalisé", async ({ page, context }) => {
  await signIn(context);
  await page.goto("/");
  await page.getByLabel("Langue ou dialecte").selectOption({ label: "✏️ Autre langue ou dialecte…" });
  await page.getByLabel("Quelle langue ou quel dialecte ?").fill("Créole de Guyane");
  await page.getByLabel("Prénom").fill("Tonton Albert");
  await page.getByLabel("Ville ou région").fill("Cayenne");
  await page.getByPlaceholder(/je veux faire la surprise/).fill("souhaiter bon anniversaire à mon père");
  await page.getByRole("button", { name: "Commencer la conversation" }).click();
  await expect(page).toHaveURL(/\/c\//);
  await expect(page.locator("h1.who")).toContainText("Tonton Albert");
  await expect(page.locator(".facts")).toContainText("Créole de Guyane");
  const conv = await db.conversation.findFirstOrThrow({ where: { id: page.url().split("/c/")[1] } });
  expect(conv.systemPrompt).toContain("Tu parles uniquement Créole de Guyane");
  expect(conv.progressKey).toBe("custom:creole de guyane");
});

test("la limite gratuite bloque après le quota du jour", async ({ page, context }) => {
  await signIn(context);
  await page.goto("/");
  await page.getByRole("button", { name: "Commencer la conversation" }).click();
  await expect(page.locator(".msg.ai").first()).toBeVisible();
  for (const t of ["un", "deux", "trois"]) {
    await page.getByPlaceholder("Votre réponse…").fill(t);
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.locator(".msg.ai").filter({ hasText: `« ${t} »` })).toBeVisible();
  }
  await page.getByPlaceholder("Votre réponse…").fill("quatre");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.locator(".msg.note")).toContainText("réponses gratuites du jour");
  await expect(page.getByRole("link", { name: "Voir l'abonnement" })).toBeVisible();
});

test("un abonné a la voix ; l'épreuve de passage fait monter de niveau", async ({ page, context }) => {
  const user = await signIn(context, { pro: true });
  await page.goto("/");
  await page.getByLabel("Langue ou dialecte").selectOption({ label: "Espagnol · Español" });
  await page.getByLabel("Niveau").selectOption("A1");
  await page.getByRole("button", { name: "Commencer la conversation" }).click();
  await expect(page.locator(".msg.ai").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Dicter votre réponse" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Écouter cette réplique" }).first()).toBeVisible();
  const speak = await page.request.post("/api/voice/speak", { data: { messageId: (await db.message.findFirstOrThrow({ where: { conversation: { userId: user.id } } })).id } });
  expect(speak.status()).toBe(200);
  expect(speak.headers()["content-type"]).toBe("audio/mpeg");

  // Les 3 paliers sont faits : l'épreuve est débloquée.
  await db.languageProgress.update({ where: { userId_key: { userId: user.id, key: "es" } }, data: { xp: 450 } });
  await page.goto("/progression");
  await page.getByRole("button", { name: "Passer l'épreuve A2" }).click();
  await expect(page.getByRole("heading", { name: "Épreuve de passage A2" })).toBeVisible();
  await expect(page.locator(".msg.ai").first()).toBeVisible();
  for (let i = 1; i <= 5; i++) {
    await page.getByPlaceholder("Votre réponse…").fill(`respuesta ${i}`);
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.locator(".msg.ai").nth(i)).toBeVisible();
  }
  await page.getByRole("button", { name: "Terminer l'épreuve" }).click();
  await expect(page.getByTestId("exam-result")).toContainText("Épreuve réussie");
  await page.goto("/progression");
  await expect(page.getByTestId("progress-card")).toContainText("A2");
  await expect(page.getByTestId("progress-card")).toContainText("Palier 1/3");
});

test("le webhook Stripe active et résilie l'abonnement", async ({ request }) => {
  const user = await db.user.create({ data: { email: `stripe-${Date.now()}@exemple.test`, stripeCustomerId: `cus_e2e_${Date.now()}` } });
  const stripe = new Stripe("sk_test_e2e");
  const send = async (status: string) => {
    const payload = JSON.stringify({
      id: "evt_test", object: "event", type: "customer.subscription.updated",
      data: { object: { id: "sub_test", object: "subscription", customer: user.stripeCustomerId, status, metadata: {},
        items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400 }] } } },
    });
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_e2e_secret" });
    return request.post("/api/stripe/webhook", { data: payload, headers: { "stripe-signature": header, "content-type": "application/json" } });
  };
  expect((await send("active")).status()).toBe(200);
  expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).subscriptionStatus).toBe("active");
  expect((await send("canceled")).status()).toBe(200);
  expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).subscriptionStatus).toBe("canceled");

  const bad = await request.post("/api/stripe/webhook", { data: "{}", headers: { "stripe-signature": "t=1,v1=faux" } });
  expect(bad.status()).toBe(400);
});

test("les API refusent les visiteurs non connectés", async ({ request }) => {
  expect((await request.post("/api/conversations", { data: {} })).status()).toBe(401);
  expect((await request.post("/api/voice/speak", { data: {} })).status()).toBe(401);
  expect((await request.post("/api/billing/checkout")).status()).toBe(401);
});

test("la connexion par e-mail envoie un lien magique", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Adresse e-mail").fill(`magic-${Date.now()}@exemple.test`);
  await page.getByRole("button", { name: "Recevoir un lien de connexion" }).click();
  await expect(page.getByRole("heading", { name: "Vérifiez vos e-mails" })).toBeVisible();
});
