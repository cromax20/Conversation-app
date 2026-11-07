import { currentUser } from "@/lib/session";
import { appUrl, getStripe } from "@/lib/stripe";
import { jsonError, unauthorized } from "@/lib/http";

export async function POST() {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!user.stripeCustomerId) return jsonError(400, "no_customer", "Aucun abonnement à gérer.");
  const session = await getStripe().billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: `${appUrl()}/abonnement` });
  return Response.json({ url: session.url });
}
