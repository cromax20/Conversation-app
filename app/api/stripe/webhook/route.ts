import type Stripe from "stripe";
import { getStripe, handleStripeEvent } from "@/lib/stripe";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Webhook non configuré", { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return new Response("Signature invalide", { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (e) {
    console.error("[stripe/webhook]", event.type, e);
    return new Response("Erreur de traitement", { status: 500 }); // Stripe réessaiera
  }
  return Response.json({ received: true });
}
