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
  await expect(page.getByTestId("upgrade-limit")).toContainText("Essayer Plus gratuitement");
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
        items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, price: { id: "price_prem_y" } }] } } },
    });
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_e2e_secret" });
    return request.post("/api/stripe/webhook", { data: payload, headers: { "stripe-signature": header, "content-type": "application/json" } });
  };
  expect((await send("active")).status()).toBe(200);
  expect(await db.user.findUniqueOrThrow({ where: { id: user.id } })).toMatchObject({ subscriptionStatus: "active", plan: "premium" });
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
  await expect(page).toHaveTitle("Alomundo · Allô, le monde t'écoute.");
  await expect(page.locator(".brand")).toContainText("Alomundo");
  await page.getByLabel("Langue du site").selectOption("en");
  await expect(page).toHaveTitle("Alomundo · Hello, the world is listening.");
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

test("page Tarifs : 3 formules, mensuel ou annuel, essai sur Plus", async ({ page }) => {
  await page.goto("/abonnement");
  await expect(page.getByRole("heading", { name: "Choisissez votre formule" })).toBeVisible();
  await expect(page.getByTestId("tier-plus")).toContainText("Le plus choisi");
  await expect(page.getByTestId("tier-plus")).toContainText("129");
  await expect(page.getByTestId("tier-plus")).toContainText("7 jours d'essai gratuit");
  await page.getByRole("radio", { name: "Mensuel" }).click();
  await expect(page.getByTestId("tier-essential")).toContainText("7,99");
  await expect(page.getByTestId("tier-plus")).toContainText("12,99");
  await expect(page.getByTestId("tier-premium")).toContainText("19,99");
  await expect(page.getByTestId("tier-premium")).toContainText("150 répliques par jour");
  await page.getByLabel("Langue du site").selectOption("en");
  await expect(page.getByTestId("tier-premium")).toContainText("€19.99");
});

test("Essentiel : cartes illimitées mais pas de voix ni d'appel ; Premium : tout", async ({ page, context, browser }) => {
  const ess = await signIn(context, { plan: "essential" });
  await db.languageProgress.create({ data: { userId: ess.id, key: "es", languageName: "Espagnol", level: "A2", startLevel: "A2" } });
  await page.goto("/");
  await page.getByRole("button", { name: "Commencer la conversation" }).click();
  await expect(page.locator(".msg.ai").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Dicter votre réponse" })).toHaveCount(0);
  await expect(page.getByTestId("remaining")).toContainText("99 réponses restantes");
  await page.goto("/cartes");
  await expect(page.getByTestId("limits")).toContainText("illimités");
  await page.goto("/appel/nouveau?key=es");
  await expect(page.getByRole("heading", { name: /Appel vidéo verrouillé/ })).toBeVisible();
  await page.goto("/abonnement");
  await expect(page.getByTestId("current-plan")).toContainText("Essentiel");

  const ctx2 = await browser.newContext({ locale: "fr-FR" });
  const prem = await signIn(ctx2, { plan: "premium" });
  const page2 = await ctx2.newPage();
  await page2.goto("/");
  await page2.getByRole("button", { name: "Commencer la conversation" }).click();
  await expect(page2.locator(".msg.ai").first()).toBeVisible();
  await expect(page2.getByRole("button", { name: "Dicter votre réponse" })).toBeVisible();
  await expect(page2.getByTestId("remaining")).toContainText("149 réponses restantes");
  expect(prem.id).toBeTruthy();
  await ctx2.close();
});

test("appel gratuit hebdomadaire au niveau B2 : 1 par semaine, 10 minutes", async ({ page, context }) => {
  const user = await signIn(context);
  await db.languageProgress.create({ data: { userId: user.id, key: "it", languageName: "Italien", level: "B2", startLevel: "B1", examsPassed: 1 } });
  await page.goto("/appel/nouveau?key=it");
  await expect(page.getByTestId("weekly-call")).toContainText("10 min");
  await page.getByRole("button", { name: /Appeler/ }).click();
  await expect(page).toHaveURL(/\/appel\/c/);
  await expect(page.getByTestId("call-left")).toContainText(/9:5\d|10:00/);
  const avatar = { skin: 0, hairStyle: "short", hairColor: "black", eyes: "brown", beard: "none", glasses: false, earrings: false, outfit: 0, scenery: "country", time: "day", voice: "coral" };
  const again = await page.request.post("/api/calls", { data: { key: "it", name: "Giulia", age: 30, place: "", topic: "", avatar } });
  expect(again.status()).toBe(429);
  // Après 10 minutes, l'appel gratuit se ferme.
  const conv = await db.conversation.findFirstOrThrow({ where: { userId: user.id, mode: "call" } });
  await db.conversation.update({ where: { id: conv.id }, data: { createdAt: new Date(Date.now() - 11 * 60_000) } });
  expect((await page.request.post(`/api/conversations/${conv.id}/reply`, { data: {} })).status()).toBe(403);
  await page.goto(`/appel/${conv.id}`);
  await expect(page.getByText("Votre appel gratuit de la semaine est terminé")).toBeVisible();
});

test("paiement : formule ou période invalide refusée", async ({ page, context }) => {
  await signIn(context);
  await page.goto("/");
  expect((await page.request.post("/api/billing/checkout", { data: { tier: "gold", interval: "month" } })).status()).toBe(400);
  expect((await page.request.post("/api/billing/checkout", { data: { tier: "plus", interval: "week" } })).status()).toBe(400);
});

test("offre de bienvenue : bandeau, compte à rebours et prix annuels réduits pendant 72 h", async ({ page, context }) => {
  await signIn(context);
  await page.goto("/");
  await expect(page.getByTestId("offer-bar")).toContainText("−30 %");
  await expect(page.getByTestId("offer-bar")).toContainText(/7[01] h/);
  await page.getByTestId("offer-bar").getByRole("link").click();
  await expect(page.getByTestId("welcome-offer")).toBeVisible();
  await expect(page.getByTestId("was-plus")).toContainText("129");
  await expect(page.getByTestId("tier-plus")).toContainText("90,30");
});

test("pas d'offre de bienvenue après 72 h ni pour les abonnés", async ({ page, context }) => {
  await signIn(context, { createdAt: new Date(Date.now() - 4 * 86_400_000) });
  await page.goto("/abonnement");
  await expect(page.getByTestId("offer-bar")).toHaveCount(0);
  await expect(page.getByTestId("welcome-offer")).toHaveCount(0);
});

test("incitation : après 5 répliques, un utilisateur gratuit voit l'offre Plus", async ({ page, context }) => {
  const user = await signIn(context, { createdAt: new Date(Date.now() - 4 * 86_400_000) });
  const conv = await db.conversation.create({ data: { userId: user.id, title: "t", language: "es", languageName: "Espagnol", progressKey: "es", level: "A2", nativeLang: "français", scene: "free", context: "", character: { name: "Lucía", age: 30, city: "", job: "barista", trait: "calme et très patient·e", hobby: "le football" }, systemPrompt: "x" } });
  await db.languageProgress.create({ data: { userId: user.id, key: "es", languageName: "Espagnol", level: "A2", startLevel: "A2" } });
  for (let i = 0; i < 5; i++) {
    await db.message.create({ data: { conversationId: conv.id, role: "assistant", text: `r${i}`, createdAt: new Date(Date.now() - 2 * 86_400_000) } });
    await db.message.create({ data: { conversationId: conv.id, role: "user", text: `u${i}`, createdAt: new Date(Date.now() - 2 * 86_400_000) } });
  }
  await page.goto(`/c/${conv.id}`);
  await expect(page.getByTestId("upgrade-teaser")).toContainText("Lucía");
  await page.getByRole("button", { name: "Plus tard" }).click();
  await expect(page.getByTestId("upgrade-teaser")).toHaveCount(0);
});

test("parrainage : lien personnel, inscrits comptés, cookie posé par le lien", async ({ page, context, browser }) => {
  const user = await signIn(context);
  await page.goto("/parrainage");
  const link = await page.getByLabel("Votre lien de parrainage").inputValue();
  const code = new URL(link).searchParams.get("ref")!;
  expect(code).toMatch(/^[A-Z0-9]{5,10}$/);
  await db.user.create({ data: { email: `filleul-${Date.now()}@exemple.test`, referredBy: code } });
  await page.reload();
  await expect(page.getByTestId("ref-invited")).toHaveText("1");
  const ctx2 = await browser.newContext({ locale: "fr-FR" });
  const p2 = await ctx2.newPage();
  await p2.goto(`/?ref=${code}`);
  await expect.poll(async () => (await ctx2.cookies()).find((c) => c.name === "ref")?.value).toBe(code);
  await ctx2.close();
  expect(user.id).toBeTruthy();
});

test("budget IA : près du plafond, l'offre gratuite fait une pause mais pas les abonnés", async ({ page, context, browser }) => {
  const spend = await db.aiUsage.create({ data: { tier: "free", kind: "reply", model: "claude-haiku-5-5", costMicros: 60_000_000 } }); // ≈ 55 € > 85 % de 50 €
  try {
    const free = await signIn(context);
    await page.goto("/");
    const conv = await db.conversation.create({ data: { userId: free.id, title: "t", language: "es", languageName: "Espagnol", progressKey: "es", level: "A2", nativeLang: "français", scene: "free", context: "", character: { name: "A", age: 30, city: "", job: "barista", trait: "calme et très patient·e", hobby: "le football" }, systemPrompt: "x" } });
    const r = await page.request.post(`/api/conversations/${conv.id}/reply`, { data: {} });
    expect(r.status()).toBe(503);
    expect((await r.json()).error.code).toBe("budget_paused");

    const ctx2 = await browser.newContext({ locale: "fr-FR" });
    const pro = await signIn(ctx2, { plan: "plus" });
    const p2 = await ctx2.newPage();
    await p2.goto("/");
    const conv2 = await db.conversation.create({ data: { userId: pro.id, title: "t", language: "es", languageName: "Espagnol", progressKey: "es", level: "A2", nativeLang: "français", scene: "free", context: "", character: { name: "A", age: 30, city: "", job: "barista", trait: "calme et très patient·e", hobby: "le football" }, systemPrompt: "x" } });
    expect((await p2.request.post(`/api/conversations/${conv2.id}/reply`, { data: {} })).status()).toBe(200);
    await ctx2.close();
  } finally {
    await db.aiUsage.delete({ where: { id: spend.id } });
  }
});

test("tableau de bord réservé au propriétaire, avec revenus et coûts", async ({ page, context, browser }) => {
  await db.user.deleteMany({ where: { email: "admin@exemple.test" } });
  await signIn(context, { email: "admin@exemple.test" });
  await db.user.create({ data: { email: `prem-${Date.now()}@exemple.test`, subscriptionStatus: "active", plan: "premium", billingInterval: "year", currentPeriodEnd: new Date(Date.now() + 300 * 86_400_000) } });
  await page.goto("/admin");
  await expect(page.getByTestId("admin")).toContainText("Revenu mensuel récurrent");
  await expect(page.getByTestId("admin")).toContainText("Budget IA mensuel");
  await expect(page.getByTestId("admin")).toContainText("Premium");
  const ctx2 = await browser.newContext({ locale: "fr-FR" });
  await signIn(ctx2);
  const p2 = await ctx2.newPage();
  expect((await p2.goto("/admin"))!.status()).toBe(404);
  await ctx2.close();
});

test("relances : série en danger envoyée une fois par jour, désinscription en un clic", async ({ request }) => {
  const today = new Date(); const y = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - 86_400_000);
  const u = await db.user.create({ data: { email: `streak-${Date.now()}@exemple.test`, streakDays: 4, lastPracticeDay: y, createdAt: new Date(Date.now() - 10 * 86_400_000), locale: "es" } });
  expect((await request.get("/api/cron/daily")).status()).toBe(401);
  const r = await request.get("/api/cron/daily", { headers: { authorization: "Bearer cron_e2e" } });
  expect(r.status()).toBe(200);
  expect((await r.json()).sent.streak).toBeGreaterThanOrEqual(1);
  expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).lastEmailAt).not.toBeNull();
  const again = await request.get("/api/cron/daily", { headers: { authorization: "Bearer cron_e2e" } });
  expect((await again.json()).sent.streak).toBe(0); // pas deux fois le même jour

  const { createHmac } = await import("node:crypto");
  const s = createHmac("sha256", "e2e-secret-e2e-secret-e2e-secret-123").update(`unsub:${u.id}`).digest("base64url").slice(0, 24);
  expect((await request.get(`/api/email/unsubscribe?u=${u.id}&s=faux`)).status()).toBe(400);
  expect((await request.get(`/api/email/unsubscribe?u=${u.id}&s=${s}`)).status()).toBe(200);
  expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).emailOptOut).toBe(true);
});

test("éco : un paquet, une traduction et une voix déjà produits sont réutilisés, sans compter dans les limites", async ({ page, context, browser }) => {
  await db.aiCache.deleteMany({});
  // 1er élève : le paquet « Nourriture » en italien A2 est généré.
  const a = await signIn(context);
  await db.languageProgress.create({ data: { userId: a.id, key: "it", languageName: "Italien", level: "A2", startLevel: "A2" } });
  await page.goto("/");
  const first = await page.request.post("/api/decks", { data: { key: "it", topic: "food" } });
  expect(first.status()).toBe(201);
  expect((await first.json()).cached).toBe(false);

  // 2e élève : même langue, niveau et thème → paquet réutilisé, et il peut encore créer un paquet aujourd'hui.
  const ctx2 = await browser.newContext({ locale: "fr-FR" });
  const b = await signIn(ctx2);
  await db.languageProgress.create({ data: { userId: b.id, key: "it", languageName: "Italien", level: "A2", startLevel: "A2" } });
  const p2 = await ctx2.newPage();
  await p2.goto("/");
  const reused = await p2.request.post("/api/decks", { data: { key: "it", topic: "food" } });
  expect((await reused.json()).cached).toBe(true);
  expect((await p2.request.post("/api/decks", { data: { key: "it", topic: "travel" } })).status()).toBe(201); // limite gratuite (1) intacte
  await ctx2.close();

  // Traduction : la même phrase n'est traduite qu'une fois et ne consomme pas de réponse.
  const conv = await db.conversation.create({ data: { userId: a.id, title: "t", language: "it", languageName: "Italien", progressKey: "it", level: "A2", nativeLang: "français", scene: "free", context: "", character: { name: "Giulia", age: 30, city: "", job: "barista", trait: "calme et très patient·e", hobby: "le football" }, systemPrompt: "x" } });
  const t1 = await (await page.request.post(`/api/conversations/${conv.id}/translate`, { data: { text: "Je voudrais un café", direction: "toTarget" } })).json();
  const t2 = await (await page.request.post(`/api/conversations/${conv.id}/translate`, { data: { text: "  je voudrais un CAFÉ ", direction: "toTarget" } })).json();
  expect(t1.cached).toBe(false);
  expect(t2.cached).toBe(true);
  expect(t2.remaining).toBe(t1.remaining);

  const row = await db.aiCache.findFirstOrThrow({ where: { kind: "deck" } });
  expect(row.hits).toBeGreaterThanOrEqual(1);
});

test("éco : la voix d'aperçu n'est synthétisée qu'une fois pour tout le monde", async ({ page, context }) => {
  await db.aiCache.deleteMany({ where: { kind: "tts" } });
  await signIn(context, { plan: "plus" });
  await page.goto("/");
  const ask = () => page.request.post("/api/voice/speak", { data: { preview: { voice: "coral", language: "Italien" } } });
  const r1 = await ask();
  expect(r1.status()).toBe(200);
  expect(r1.headers()["x-cache"]).toBe("MISS");
  const r2 = await ask();
  expect(r2.headers()["x-cache"]).toBe("HIT");
  expect(Buffer.from(await r2.body()).equals(Buffer.from(await r1.body()))).toBe(true);
});

test("éco : le tableau de bord affiche les appels évités, le ménage quotidien tourne", async ({ page, context, request }) => {
  await db.user.deleteMany({ where: { email: "admin@exemple.test" } });
  await signIn(context, { email: "admin@exemple.test" });
  await page.goto("/admin");
  await expect(page.getByTestId("eco")).toContainText("Appels évités");
  const old = await db.usageEvent.create({ data: { userId: (await db.user.findFirstOrThrow({ where: { email: "admin@exemple.test" } })).id, kind: "card", createdAt: new Date(Date.now() - 90 * 86_400_000) } });
  const r = await request.get("/api/cron/daily", { headers: { authorization: "Bearer cron_e2e" } });
  expect((await r.json()).cleaned.usageEvents).toBeGreaterThanOrEqual(1);
  expect(await db.usageEvent.findUnique({ where: { id: old.id } })).toBeNull();
});
