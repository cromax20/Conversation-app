import Stripe from "stripe";
import { prisma } from "./db";
import { isPaidTier, tierFromPrice } from "./plan";

let stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY manquant");
  stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

export const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

/** Fin de période d'un abonnement (champ déplacé sur les items dans les versions récentes de l'API). */
export function periodEnd(sub: Stripe.Subscription): Date | null {
  const s = sub as unknown as { current_period_end?: number; items?: { data?: { current_period_end?: number }[] } };
  const ts = s.items?.data?.[0]?.current_period_end ?? s.current_period_end;
  return typeof ts === "number" ? new Date(ts * 1000) : null;
}

/** Formule d'un abonnement : d'après son prix, sinon d'après les métadonnées posées au paiement. */
export function subscriptionTier(sub: Stripe.Subscription) {
  const price = sub.items?.data?.[0]?.price;
  const priceId = typeof price === "string" ? price : price?.id;
  return tierFromPrice(priceId) ?? (isPaidTier(sub.metadata?.tier) ? sub.metadata.tier : null);
}

/** Recopie l'état d'un abonnement Stripe sur l'utilisateur correspondant. */
export async function syncSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const userId = sub.metadata?.userId;
  const tier = subscriptionTier(sub);
  const data = {
    subscriptionId: sub.id, subscriptionStatus: sub.status, currentPeriodEnd: periodEnd(sub), stripeCustomerId: customerId,
    ...(tier ? { plan: tier } : {}),
    ...(sub.status === "trialing" || sub.trial_end ? { hadTrial: true } : {}),
  };
  const byCustomer = await prisma.user.updateMany({ where: { stripeCustomerId: customerId }, data });
  if (byCustomer.count === 0 && userId) {
    await prisma.user.update({ where: { id: userId }, data });
  }
}

/** Traite un événement webhook déjà vérifié. Renvoie true s'il a été utilisé. */
export async function handleStripeEvent(event: Stripe.Event, stripeClient: Pick<Stripe, "subscriptions"> = getStripe()): Promise<boolean> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "subscription" || !session.subscription) return false;
      const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const sub = await stripeClient.subscriptions.retrieve(subId);
      const userId = session.client_reference_id ?? sub.metadata?.userId;
      if (userId && session.customer) {
        const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
        await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
      }
      await syncSubscription(sub);
      return true;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      return true;
    default:
      return false;
  }
}
