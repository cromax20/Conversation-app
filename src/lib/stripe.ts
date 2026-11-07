import Stripe from "stripe";
import { prisma } from "./db";
import { isPaidTier, tierFromPrice } from "./plan";
import { referralAmountEur } from "./growth";

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
  const price = sub.items?.data?.[0]?.price;
  const interval = typeof price === "object" ? price?.recurring?.interval : undefined;
  const data = {
    subscriptionId: sub.id, subscriptionStatus: sub.status, currentPeriodEnd: periodEnd(sub), stripeCustomerId: customerId,
    ...(tier ? { plan: tier } : {}),
    ...(interval === "month" || interval === "year" ? { billingInterval: interval } : {}),
    ...(sub.status === "trialing" || sub.trial_end ? { hadTrial: true } : {}),
  };
  const byCustomer = await prisma.user.updateMany({ where: { stripeCustomerId: customerId }, data });
  if (byCustomer.count === 0 && userId) {
    await prisma.user.update({ where: { id: userId }, data });
  }
}

/** Premier vrai paiement d'un filleul : le parrain reçoit un crédit sur son compte Stripe. */
export async function rewardReferrer(invoice: Stripe.Invoice, stripeClient: Stripe) {
  if (!invoice.amount_paid || invoice.amount_paid <= 0 || !invoice.customer) return;
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer.id;
  const referee = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
  if (!referee?.referredBy || referee.referralRewarded) return;
  const referrer = await prisma.user.findUnique({ where: { referralCode: referee.referredBy } });
  // Marqué d'abord : un webhook rejoué ne récompense jamais deux fois.
  const claimed = await prisma.user.updateMany({ where: { id: referee.id, referralRewarded: false }, data: { referralRewarded: true } });
  if (!referrer || claimed.count === 0) return;
  let referrerCustomer = referrer.stripeCustomerId;
  if (!referrerCustomer) {
    const c = await stripeClient.customers.create({ email: referrer.email ?? undefined, metadata: { userId: referrer.id } });
    referrerCustomer = c.id;
  }
  const cents = Math.round(referralAmountEur() * 100);
  await stripeClient.customers.createBalanceTransaction(referrerCustomer, { amount: -cents, currency: "eur", description: "Alomundo : parrainage" });
  await prisma.user.update({ where: { id: referrer.id }, data: { stripeCustomerId: referrerCustomer, referralCredits: { increment: cents } } });
}

/** Traite un événement webhook déjà vérifié. Renvoie true s'il a été utilisé. */
export async function handleStripeEvent(event: Stripe.Event, stripeClient: Pick<Stripe, "subscriptions" | "customers"> = getStripe()): Promise<boolean> {
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
    case "invoice.paid":
    case "invoice.payment_succeeded":
      await rewardReferrer(event.data.object as Stripe.Invoice, stripeClient as Stripe);
      return true;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      return true;
    default:
      return false;
  }
}
