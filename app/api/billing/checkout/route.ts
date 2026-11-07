import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { isPro } from "@/lib/plan";
import { appUrl, getStripe } from "@/lib/stripe";
import { jsonError, unauthorized } from "@/lib/http";

export async function POST() {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (isPro(user)) return jsonError(409, "already_pro", "Vous êtes déjà abonné·e.");
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) return jsonError(503, "billing_unavailable", "Le paiement n'est pas encore configuré.");

  const stripe = getStripe();
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email ?? undefined, name: user.name ?? undefined, metadata: { userId: user.id } });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    subscription_data: { metadata: { userId: user.id } },
    allow_promotion_codes: true,
    success_url: `${appUrl()}/abonnement?merci=1`,
    cancel_url: `${appUrl()}/abonnement`,
  });
  return Response.json({ url: session.url });
}
