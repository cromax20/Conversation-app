// Croissance : offre de bienvenue et parrainage.
import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import { tierOf, type PlanUser } from "./plan";

const num = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
export const welcomeHours = () => num(process.env.WELCOME_HOURS, 72);
/** Doit correspondre au coupon Stripe STRIPE_COUPON_WELCOME (pourcentage, durée « once »). */
export const welcomePercent = () => num(process.env.WELCOME_PERCENT, 30);
/** Doit correspondre au coupon Stripe STRIPE_COUPON_REFERRAL (montant fixe, durée « once »). */
export const referralAmountEur = () => num(process.env.REFERRAL_AMOUNT_EUR, 10);

type GrowthUser = PlanUser & { createdAt: Date; subscriptionId: string | null; referredBy?: string | null };

/** Offre de bienvenue : nouveaux inscrits jamais abonnés, pendant 72 h, sur les formules annuelles. */
export function welcomeEndsAt(u: GrowthUser, now = new Date()): Date | null {
  if (!process.env.STRIPE_COUPON_WELCOME || tierOf(u, now) !== "free" || u.subscriptionId) return null;
  const end = new Date(u.createdAt.getTime() + welcomeHours() * 3_600_000);
  return end > now ? end : null;
}

export function referralEligible(u: GrowthUser): boolean {
  return Boolean(process.env.STRIPE_COUPON_REFERRAL && u.referredBy && !u.subscriptionId);
}

/** Réduction à appliquer au paiement (Stripe n'en accepte qu'une) : la plus avantageuse. */
export function checkoutCoupon(u: GrowthUser, interval: "month" | "year", now = new Date()): string | null {
  if (interval === "year" && welcomeEndsAt(u, now)) return process.env.STRIPE_COUPON_WELCOME!;
  if (referralEligible(u)) return process.env.STRIPE_COUPON_REFERRAL!;
  return null;
}

export async function ensureReferralCode(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (u?.referralCode) return u.referralCode;
  for (let i = 0; i < 5; i++) {
    const code = randomBytes(5).toString("base64url").replace(/[-_]/g, "").slice(0, 7).toUpperCase();
    try {
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch { /* collision : on réessaie */ }
  }
  throw new Error("Impossible de créer un code de parrainage");
}

export const isReferralCode = (v: unknown): v is string => typeof v === "string" && /^[A-Z0-9]{5,10}$/.test(v);
