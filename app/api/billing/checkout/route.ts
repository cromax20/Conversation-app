import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { PAID_TIERS, TRIAL_DAYS, isPro, stripePriceId } from "@/lib/plan";
import { appUrl, getStripe } from "@/lib/stripe";
import { jsonError, unauthorized } from "@/lib/http";

const Body = z.object({ tier: z.enum(PAID_TIERS), interval: z.enum(["month", "year"]) });

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid", "Formule invalide.");
  const { tier, interval } = parsed.data;
  // Déjà abonné·e : le changement de formule se fait dans le portail Stripe.
  if (isPro(user)) return jsonError(409, "already_pro", "Vous êtes déjà abonné·e.");
  const price = stripePriceId(tier, interval);
  if (!process.env.STRIPE_SECRET_KEY || !price) return jsonError(503, "billing_unavailable", "Le paiement n'est pas encore configuré.");

  const stripe = getStripe();
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email ?? undefined, name: user.name ?? undefined, metadata: { userId: user.id } });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  // Essai gratuit (Plus) : une seule fois par compte.
  const trialDays = !user.hadTrial && !user.subscriptionId ? TRIAL_DAYS[tier] : undefined;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { userId: user.id, tier }, ...(trialDays ? { trial_period_days: trialDays } : {}) },
    allow_promotion_codes: true,
    success_url: `${appUrl()}/abonnement?merci=1`,
    cancel_url: `${appUrl()}/abonnement`,
  });
  return Response.json({ url: session.url });
}
