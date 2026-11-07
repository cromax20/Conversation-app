import { expect, test } from "@playwright/test";
import Stripe from "stripe";
import { db, signIn } from "./helpers";

test.afterAll(async () => { await db.$disconnect(); });

test("un visiteur voit le générateur et doit se connecter pour discuter", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Parlez une nouvelle langue, pour de vrai." })).toBeVisible();
  // Un « bonjour » flottant choisit la langue.
  await page.getByRole("button", { name: "Azul", exact: true }).click({ force: true }); // la bulle flotte en continu
  await expect(page.getByLabel("Langue ou dialecte")).toHaveValue("kab");
  await expect(page.locator(".speech")).toContainText("Azul");
  await expect(page.locator(".who")).toContainText("ans");
  await expect(page.getByRole("button", { name: "💬 Discussion libre" })).toHaveAttribute("aria-pressed", "true");
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
  await page.goto("/parcours");
  await expect(page.getByTestId("path")).toContainText("Kabyle");
  await expect(page.locator('[data-state="current"]')).toContainText("A2 · Palier 1");
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
  await page.goto("/parcours?lang=es");
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
  await page.goto("/parcours?lang=es");
  await expect(page.locator(".path-head")).toContainText("A2");
  await expect(page.locator(".path-head")).toContainText("Palier 1/3");
  const p = await db.languageProgress.findUniqueOrThrow({ where: { userId_key: { userId: user.id, key: "es" } } });
  expect(p.examsPassed).toBe(1);
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

test("la langue du site se change à tout moment (y compris l'arabe, de droite à gauche)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Parlez une nouvelle langue, pour de vrai.");
  await page.getByLabel("Langue du site").selectOption("en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Speak a new language, for real.");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Language or dialect")).toContainText("Japanese");
  await page.getByLabel("Site language").selectOption("ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("تحدّث لغة جديدة، بحق.");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("تحدّث لغة جديدة، بحق.");
  await page.getByLabel("لغة الموقع").selectOption("fr");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("parcours : fond et autocollants propres à la langue, appel verrouillé avant B2", async ({ page, context }) => {
  const user = await signIn(context);
  await db.languageProgress.create({ data: { userId: user.id, key: "es", languageName: "Espagnol", level: "A2", startLevel: "A1", xp: 200 } });
  await page.goto("/parcours");
  await expect(page.getByTestId("path")).toContainText("Espagnol");
  await expect(page.locator(".stickers [title='Paella']")).toBeAttached();
  await expect(page.locator(".node.done").first()).toContainText("Sagrada Família");
  await expect(page.locator('.node-call')).toHaveAttribute("data-state", "locked");
  await page.goto("/appel/nouveau?key=es");
  await expect(page.getByRole("heading", { name: /Appel vidéo verrouillé/ })).toBeVisible();
  expect((await page.request.post("/api/calls", { data: { key: "es", name: "x", age: 30, place: "", topic: "", avatar: {} } })).status()).toBe(400);
});

test("appel vidéo gratuit au niveau B2 validé : personnalisation, expressions, raccrocher", async ({ page, context }) => {
  const user = await signIn(context);
  await db.languageProgress.create({ data: { userId: user.id, key: "es", languageName: "Espagnol", level: "B2", startLevel: "A2", xp: 0, examsPassed: 3 } });
  await page.goto("/parcours");
  await expect(page.locator(".node-call")).toHaveAttribute("data-state", "done");
  await page.getByRole("link", { name: "Lancer un appel vidéo" }).click();
  await expect(page.getByRole("heading", { name: "Créer votre interlocuteur" })).toBeVisible();
  await page.getByLabel("Prénom").fill("Carmen");
  await page.getByLabel("Coiffure").selectOption("headscarf");
  await page.getByLabel("Lunettes").selectOption("true");
  await page.getByLabel("Paysage").selectOption("sea");
  await page.getByRole("button", { name: /Appeler/ }).click();

  await expect(page).toHaveURL(/\/appel\/c/);
  const room = page.getByTestId("callroom");
  await page.getByRole("button", { name: "Appeler" }).click();
  await expect(page.getByTestId("subtitle")).toContainText("Bonjour !");
  await expect(page.getByTestId("subtitle")).not.toContainText("[sourire]");
  await expect(room).toHaveAttribute("data-status", "idle", { timeout: 15000 });
  await page.getByRole("button", { name: "Écrire plutôt" }).click();
  await page.getByPlaceholder("Votre réponse…").fill("Hola Carmen, ¿qué tal?");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByTestId("subtitle")).toContainText("Réponse simulée");
  await expect(room).toHaveAttribute("data-expression", "rire");
  await expect(room).toHaveAttribute("data-status", "idle", { timeout: 15000 });
  await page.getByRole("button", { name: "Raccrocher" }).click();
  await expect(page.getByText(/Appel terminé/)).toBeVisible();

  const conv = await db.conversation.findFirstOrThrow({ where: { userId: user.id, mode: "call" }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  expect((conv.character as { avatar: { hairStyle: string; glasses: boolean } }).avatar).toMatchObject({ hairStyle: "headscarf", glasses: true });
  expect(conv.messages.map((m) => m.text)[0]).toBe("Bonjour ! Comment puis-je vous aider ?");
  // La voix de l'appel est autorisée sans abonnement une fois débloquée.
  expect((await page.request.post("/api/voice/speak", { data: { messageId: conv.messages[0].id } })).status()).toBe(200);
});

test("un abonné accède à l'appel dès le début du parcours", async ({ page, context }) => {
  const user = await signIn(context, { pro: true });
  await db.languageProgress.create({ data: { userId: user.id, key: "ja", languageName: "Japonais", level: "A1", startLevel: "A1" } });
  await page.goto("/parcours");
  await page.locator(".callbanner").click();
  await expect(page.getByRole("heading", { name: "Créer votre interlocuteur" })).toBeVisible();
});

test("discussion libre par défaut : pas de scénario", async ({ page, context }) => {
  const user = await signIn(context);
  await page.goto("/");
  await page.getByRole("button", { name: "Commencer la conversation" }).click();
  await expect(page).toHaveURL(/\/c\//);
  await expect(page.locator(".scene")).toContainText("Discussion libre");
  const conv = await db.conversation.findFirstOrThrow({ where: { userId: user.id } });
  expect(conv.scene).toBe("free");
  expect(conv.systemPrompt).toContain("discussion libre et naturelle");
});

test("coup de pouce débutant : phrases pour commencer et traductions", async ({ page, context }) => {
  const user = await signIn(context);
  await page.goto("/?lang=ja");
  await page.getByLabel("Niveau").selectOption("A1");
  await page.getByRole("button", { name: "Au restaurant" }).click();
  await page.getByRole("button", { name: "Commencer la conversation" }).click();
  await expect(page.locator(".msg.ai").first()).toBeVisible();
  await expect(page.getByTestId("remaining")).toContainText("3 réponses restantes");

  // Panneau ouvert d'office en A1, avec 8 phrases.
  await expect(page.locator(".phrases li")).toHaveCount(8);
  await expect(page.locator(".phrases li").first()).toContainText("fra-sé ou-til");
  await page.locator(".phrases button").first().click();
  await expect(page.getByPlaceholder("Votre réponse…")).toHaveValue("Frase útil 1");
  await expect(page.getByTestId("remaining")).toContainText("3 réponses restantes"); // les phrases ne coûtent rien

  // Dire une phrase dans sa langue → traduite dans la langue apprise.
  await page.getByLabel("Dites-le dans votre langue").fill("Je voudrais un thé, s'il vous plaît");
  await page.getByRole("button", { name: "Traduire", exact: true }).click();
  await expect(page.getByTestId("translation")).toContainText("Je voudrais un thé");
  await expect(page.getByTestId("translation")).toContainText("pro-non-cia-tion");
  await page.getByRole("button", { name: "Utiliser" }).click();
  await expect(page.getByPlaceholder("Votre réponse…")).toHaveValue(/Frase útil 1 \[Japonais\] Je voudrais un thé/);
  await expect(page.getByTestId("remaining")).toContainText("2 réponses restantes");

  // Traduire une réplique du personnage.
  await page.getByRole("button", { name: "🌐 traduire" }).first().click();
  await expect(page.getByTestId("line-translation")).toContainText("[traduction] Bonjour");
  const conv = await db.conversation.findFirstOrThrow({ where: { userId: user.id } });
  expect(Array.isArray(conv.phrases)).toBe(true);
});

test("pas de coup de pouce pendant une épreuve", async ({ page, context }) => {
  const user = await signIn(context);
  await db.languageProgress.create({ data: { userId: user.id, key: "de", languageName: "Allemand", level: "A1", startLevel: "A1", xp: 450 } });
  await page.goto("/parcours?lang=de");
  await page.getByRole("button", { name: "Passer l'épreuve A2" }).click();
  await expect(page.locator(".msg.ai").first()).toBeVisible();
  await expect(page.getByTestId("assist")).toHaveCount(0);
  const id = page.url().split("/c/")[1];
  expect((await page.request.post(`/api/conversations/${id}/translate`, { data: { text: "hallo", direction: "toNative" } })).status()).toBe(404);
});

test("mode écrit : pas de micro ni de son, l'appel se fait par écrit", async ({ page, context }) => {
  const user = await signIn(context, { pro: true });
  await page.goto("/");
  await page.getByLabel("✍️ À l'écrit seulement").check();
  await page.getByRole("button", { name: "Commencer la conversation" }).click();
  await expect(page.locator(".msg.ai").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Dicter votre réponse" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Écouter cette réplique" })).toHaveCount(0);
  await page.getByLabel("✍️ À l'écrit seulement").uncheck();
  await expect(page.getByRole("button", { name: "Dicter votre réponse" })).toBeVisible();
  await page.getByLabel("✍️ À l'écrit seulement").check();

  const progress = await db.languageProgress.findFirstOrThrow({ where: { userId: user.id } });
  await page.goto(`/appel/nouveau?key=${progress.key}`);
  await page.getByRole("button", { name: /Appeler/ }).click();
  await page.getByRole("button", { name: "Appeler" }).click();
  await expect(page.getByTestId("subtitle")).toContainText("Bonjour !");
  await expect(page.getByRole("button", { name: "Appuyez pour parler" })).toHaveCount(0);
  await expect(page.getByPlaceholder("Votre réponse…")).toBeVisible(); // saisie ouverte d'office
  await expect(page.getByTestId("callroom")).toHaveAttribute("data-status", "idle", { timeout: 15000 });
  await page.getByPlaceholder("Votre réponse…").fill("Hello");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByTestId("subtitle")).toContainText("Réponse simulée");
});

test("cartes et quiz : paquet, révision, quiz, XP et limites de la version gratuite", async ({ page, context }) => {
  const user = await signIn(context);
  await db.languageProgress.create({ data: { userId: user.id, key: "es", languageName: "Espagnol", level: "A2", startLevel: "A2" } });
  await page.goto("/cartes");
  await expect(page.getByTestId("limits")).toContainText("3 cartes, 1 quiz et 1 nouveaux paquets par jour");

  // Créer un paquet (1 par jour en gratuit).
  await page.getByTestId("deck-food").getByRole("button", { name: "Créer le paquet" }).click();
  await expect(page.getByTestId("deck-food")).toContainText("10 cartes");
  await page.getByTestId("deck-travel").getByRole("button", { name: "Créer le paquet" }).click();
  await expect(page.locator(".msg.note")).toContainText("paquets gratuits du jour");

  // Réviser : retourner la carte, puis répondre (3 cartes par jour en gratuit).
  await page.getByTestId("deck-food").getByRole("button", { name: /Réviser · 10 à revoir/ }).click();
  await expect(page.getByTestId("flashcard")).toContainText("Palabra 1");
  await expect(page.getByRole("button", { name: "✅ Je savais" })).toBeDisabled();
  await page.getByTestId("flashcard").click();
  await page.getByRole("button", { name: "✅ Je savais" }).click();
  await page.getByTestId("flashcard").click();
  await page.getByRole("button", { name: "🔁 À revoir" }).click();
  await page.getByTestId("flashcard").click();
  await page.getByRole("button", { name: "✅ Je savais" }).click();
  await page.getByTestId("flashcard").click();
  await page.getByRole("button", { name: "✅ Je savais" }).click();
  await expect(page.locator(".msg.note")).toContainText("cartes gratuites du jour");
  const reviews = await db.cardReview.findMany({ where: { deck: { userId: user.id } }, orderBy: { index: "asc" } });
  expect(reviews.map((r) => r.box)).toEqual([2, 1, 2]);

  // Quiz : 10 questions, +2 XP par bonne réponse, 1 quiz par jour en gratuit.
  await page.getByRole("button", { name: /Lancer un quiz/ }).click();
  for (let i = 0; i < 10; i++) {
    await expect(page.getByTestId("quiz")).toContainText(`Question ${i + 1}/10`);
    const prompt = (await page.locator(".quiz-prompt b").textContent())!;
    const n = prompt.match(/\d+/)![0];
    const target = prompt.startsWith("Palabra") ? `Mot ${n}` : `Palabra ${n}`;
    await page.locator(".option", { hasText: new RegExp(`^${target}$`) }).click();
    await page.getByRole("button", { name: "Suivant" }).click();
  }
  await expect(page.getByTestId("quiz-result")).toContainText("10/10 bonnes réponses · +20 XP");
  const p = await db.languageProgress.findUniqueOrThrow({ where: { userId_key: { userId: user.id, key: "es" } } });
  expect(p.xp).toBe(20);
  await page.getByRole("button", { name: "Fermer" }).click();
  await page.getByRole("button", { name: /Lancer un quiz/ }).click();
  await expect(page.locator(".msg.note")).toContainText("quiz gratuits du jour");
  // Terminer un quiz jamais commencé ne rapporte rien.
  expect((await page.request.post("/api/quiz/finish", { data: { key: "es", correct: 10 } })).status()).toBe(409);
});

test("cartes et quiz illimités pour les abonnés", async ({ page, context }) => {
  const user = await signIn(context, { pro: true });
  await db.languageProgress.create({ data: { userId: user.id, key: "ja", languageName: "Japonais", level: "A1", startLevel: "A1" } });
  await page.goto("/cartes");
  await expect(page.getByTestId("limits")).toContainText("Cartes et quiz illimités");
  for (const topic of ["food", "travel"]) {
    await page.getByTestId(`deck-${topic}`).getByRole("button", { name: "Créer le paquet" }).click();
    await expect(page.getByTestId(`deck-${topic}`)).toContainText("10 cartes");
  }
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: /Lancer un quiz/ }).click();
    await expect(page.getByTestId("quiz")).toBeVisible();
    await page.getByRole("button", { name: "Fermer" }).click();
  }
});

test("fond d'appel animé : scènes du pays qui changent", async ({ page, context }) => {
  const user = await signIn(context, { pro: true });
  await db.languageProgress.create({ data: { userId: user.id, key: "ja", languageName: "Japonais", level: "A1", startLevel: "A1" } });
  await page.goto("/appel/nouveau?key=ja");
  await expect(page.getByLabel("Paysage")).toHaveValue("country");
  await page.getByRole("button", { name: /Appeler/ }).click();
  const backdrop = page.locator(".call-bg");
  await expect(backdrop.locator(".scene-layer")).toHaveCount(3);
  await expect(backdrop.locator(".ambience")).toHaveCount(1);
  await expect(backdrop).toHaveAttribute("data-scene", "1", { timeout: 20000 });
});
