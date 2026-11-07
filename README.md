# Alomundo

**Allô, le monde t'écoute.** « Allô » est le mot qu'on dit en décrochant dans des dizaines de langues (allô, alô, aló, алло, alo, ألو, الو, a lô, halo) et « mundo » se comprend presque partout : Alomundo, c'est « Allô le monde ».

Site pour pratiquer une langue en discutant avec des personnages joués par Claude, à l'écrit ou à voix haute.

- **Langue du site au choix** : français, anglais, espagnol, portugais, arabe (de droite à gauche) et allemand. Le choix est mémorisé, sinon la langue du navigateur est utilisée.
- **Comptes** : connexion par lien magique (e-mail) ou Google.
- **Historique** : chaque conversation est enregistrée et peut être reprise.
- **Langues** : 136 langues et dialectes (darija, kabyle, créoles, wolof, alsacien, cantonais, quechua…), ou **n'importe quelle langue ou dialecte** saisi librement. Prénom, ville et âge du personnage modifiables.
- **Discussion libre** (par défaut) : on parle de ce qu'on veut, le personnage suit. Ou une mise en situation (café, médecin, entretien…), ou une situation écrite par l'élève.
- **Coup de pouce pour débutants** : 8 phrases pour commencer selon la situation (traduction et prononciation), « Dites-le dans votre langue » (traduction vers la langue apprise), bouton « traduire » sous chaque réplique.
- **Mode écrit** : pour les transports, sans son ni micro, réponses comprises (aussi pendant les appels).
- **Parcours façon jeu mobile** : un chemin de cases (3 paliers par niveau, épreuve de passage notée par Claude, A1 → C2) sur un fond propre à chaque langue (paysage, couleurs, monuments, plats), autocollants à collectionner, série de jours.
- **Appel vidéo façon FaceTime** : fond animé avec les paysages et monuments du pays qui se succèdent (jour, coucher de soleil, nuit ; montgolfières, voiliers, passants, lucioles, lanternes, aurores…), interlocuteur entièrement personnalisable (visage, coiffure, voix, paysage), expressions du visage selon la conversation, bouche animée sur la voix, sous-titres, caméra de l'élève en vignette. Inclus dans l'abonnement, ou **gratuit une fois le niveau B2 validé** par une épreuve (réglable avec `CALL_FREE_LEVEL`).
- **Cartes & quiz** : 10 thèmes par niveau (se présenter, famille, nourriture, voyage, opinions…), cartes créées par Claude, révision espacée, quiz à choix multiples qui rapportent des XP. Gratuit : 20 cartes, 3 quiz et 2 nouveaux paquets par jour (`FREE_DAILY_CARDS`, `FREE_DAILY_QUIZZES`, `FREE_DAILY_DECKS`). Illimité avec l'abonnement.
- **Accueil animé** : bandeau coloré avec des « bonjour » du monde entier (un clic choisit la langue), création en 3 étapes, aperçu aux couleurs et paysages de la langue avec le visage du personnage.
- **Économies automatiques** : coût réel mesuré à chaque appel, budget IA mensuel (l'offre gratuite fait une pause à 85 %), historique des très longues conversations raccourci par paquets, Haiku pour toutes les petites tâches.
- **Conversion** : offre de bienvenue de 72 h (−30 % sur la 1re année des formules annuelles, avec compte à rebours), essai de 7 jours sur Plus, incitations aux bons moments (limite atteinte, après 5 répliques, après une épreuve réussie), parrainage (10 € offerts au filleul et 10 € de crédit au parrain).
- **Relances par e-mail** (une fois par jour, dans la langue de l'utilisateur) : série en danger, retour après 7 jours, fin de l'offre de bienvenue ; désinscription en un clic.
- **Tableau de bord** (`/admin`, réservé à `ADMIN_EMAILS`) : abonnés par formule, revenu mensuel, coût IA réel, marge estimée, conversion, budget.
- **Voix premium** (abonnés) : écouter chaque réplique et répondre en dictée.
- **Formules** (Stripe, mensuel ou annuel avec 2 mois offerts) :

  | | Gratuit | Essentiel | Plus ⭐ | Premium |
  |---|---|---|---|---|
  | Prix | 0 € | 7,99 € / mois · 79 € / an | 12,99 € / mois · 129 € / an (7 jours d'essai) | 19,99 € / mois · 199 € / an |
  | Personnages | Claude Haiku 5.5 | Claude Haiku 5.5 | Claude Sonnet 5.5 | Claude Opus 5.5 |
  | Répliques / jour | 10 | 100 | 100 | 150 |
  | Cartes & quiz | limités | illimités | illimités | illimités |
  | Voix et dictée | – | – | ✅ | ✅ |
  | Appels vidéo | 1 appel de 10 min / semaine une fois B2 validé | idem | ✅ | ✅ |

  Les petites tâches (traductions, phrases utiles, paquets de cartes) utilisent toujours Claude Haiku 5.5 ; les épreuves sont notées par Claude Sonnet 5.5 pour tout le monde.

Les visages et les paysages sont des illustrations animées (SVG), sans photos ni service vidéo externe.

Technique : Next.js 16, Auth.js, Prisma + Postgres, API Claude (`@anthropic-ai/sdk`), voix OpenAI, Stripe.

---

## Mettre en ligne sur Vercel (pas à pas)

### 1. Créer les comptes et récupérer les clés

| Service | À quoi il sert | Ce qu'il faut récupérer |
|---|---|---|
| [Neon](https://neon.tech) (ou Vercel Postgres) | Base de données | `DATABASE_URL` (URL *pooled*) et `DIRECT_URL` (URL directe) |
| [Anthropic](https://console.anthropic.com) | Les personnages | `ANTHROPIC_API_KEY` |
| [OpenAI](https://platform.openai.com) | Voix et dictée | `OPENAI_API_KEY` |
| [Stripe](https://dashboard.stripe.com) | Abonnements | `STRIPE_SECRET_KEY`, les 6 `STRIPE_PRICE_…`, `STRIPE_WEBHOOK_SECRET` (étape 4) |
| [Resend](https://resend.com) | E-mails de connexion | `AUTH_RESEND_KEY` et une adresse d'envoi vérifiée `EMAIL_FROM` |
| [Google Cloud](https://console.cloud.google.com/apis/credentials) | Bouton « Continuer avec Google » | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` |

Dans Stripe (en **mode test** pour commencer), créez **3 produits** : Essentiel, Plus et Premium. Pour chacun, ajoutez **2 prix récurrents** (mensuel et annuel, voir le tableau ci-dessus), puis copiez les 6 identifiants `price_…` dans les variables `STRIPE_PRICE_…` de `.env.example`. L'essai de 7 jours sur Plus est géré par l'application, inutile de le configurer dans Stripe.

Dans **Paramètres → Billing → Portail client**, autorisez le **changement de formule** entre les 3 produits et leurs 6 prix : c'est là que vos abonnés passeront d'Essentiel à Plus, de mensuel à annuel, etc.

### 2. Importer le projet dans Vercel

1. Sur [vercel.com/new](https://vercel.com/new), importez le dépôt GitHub `Conversation-app`.
2. Dans **Settings → Environment Variables**, ajoutez toutes les variables listées dans `.env.example`, plus :
   - `AUTH_SECRET` : générez-le avec `openssl rand -base64 32` ;
   - `APP_URL` : l'adresse du site, par ex. `https://atelier.vercel.app` ;
   - facultatif : `NEXT_PUBLIC_PRICE_LABEL` (texte du prix affiché, par défaut « 9 € / mois »).
3. Lancez le déploiement. Le script `vercel-build` crée automatiquement les tables (`prisma migrate deploy`).

### 3. Connexion Google

Dans Google Cloud, ajoutez l'URI de redirection autorisée :
`https://VOTRE-DOMAINE/api/auth/callback/google`

### 4. Webhook Stripe

Dans Stripe → **Développeurs → Webhooks**, ajoutez l'endpoint `https://VOTRE-DOMAINE/api/stripe/webhook` avec les événements :
`checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
Copiez le secret de signature (`whsec_…`) dans `STRIPE_WEBHOOK_SECRET` sur Vercel, puis redéployez.

Activez aussi le **portail client** (Stripe → Paramètres → Billing → Portail client) pour que les abonnés gèrent leur abonnement et leurs factures.

### 4 bis. Croissance et économies

1. **Coupons Stripe** (Catalogue de produits → Coupons) :
   - « Bienvenue » : **30 %**, durée **une fois** → identifiant dans `STRIPE_COUPON_WELCOME`.
   - « Parrainage » : **10 €** (EUR), durée **une fois** → identifiant dans `STRIPE_COUPON_REFERRAL`.
2. Ajoutez l'événement **`invoice.paid`** au webhook Stripe (récompense du parrain).
3. Dans Stripe → Paramètres → Billing → Abonnements et e-mails, activez **le rappel de fin d'essai** et **les e-mails de paiement échoué** (récupère des abonnés sans rien coder).
4. Sur Vercel : `CRON_SECRET` (relances quotidiennes, déjà déclarées dans `vercel.json`), `ADMIN_EMAILS` (votre adresse), `AI_MONTHLY_BUDGET_EUR` (par ex. 60).

### 5. Tester en ligne

Carte de test Stripe : `4242 4242 4242 4242`, date future, n'importe quel code. Quand tout fonctionne, passez Stripe en mode réel et remplacez les clés de test.

---

## Développement local

```bash
npm install
cp .env.example .env      # puis remplir au minimum DATABASE_URL, DIRECT_URL, AUTH_SECRET
npm run db:migrate
npm run dev
```

Sans `AUTH_RESEND_KEY`, le lien de connexion s'affiche dans le terminal. Avec `MOCK_AI=1`, les réponses du personnage et la voix sont simulées (aucun appel payant).

### Tests

```bash
npm test             # tests unitaires (Vitest)
npm run test:e2e     # parcours complets dans un navigateur (Playwright), réponses simulées
```

Les tests de bout en bout utilisent une base séparée (`TEST_DATABASE_URL`, par défaut `postgresql://postgres@localhost:5433/atelier_test`).

## Coûts à prévoir

- **Claude** : environ 0,02 centime par réplique avec Haiku (Gratuit, Essentiel), 0,4 centime avec Sonnet (Plus), 0,75 centime avec Opus (Premium). Les modèles se changent avec `MODEL_FREE`, `MODEL_ESSENTIAL`, `MODEL_PLUS`, `MODEL_PREMIUM`.
- **Voix** : facturée à la minute par OpenAI, réservée aux abonnés.
- Les limites quotidiennes (`FREE_DAILY_REPLIES`, `ESSENTIAL_DAILY_REPLIES`, `PLUS_DAILY_REPLIES`, `PREMIUM_DAILY_REPLIES`) protègent votre budget.

En cas de refus par un filtre de sécurité, l'API réessaie automatiquement sur le modèle recommandé (`fallbacks: "default"`).

L'artifact d'origine est conservé dans `legacy/atelier-artifact.html`.
