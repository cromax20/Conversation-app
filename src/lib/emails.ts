import { createHmac } from "node:crypto";
import { prisma } from "./db";
import { tierOf } from "./plan";
import { welcomeEndsAt, welcomePercent } from "./growth";
import { appUrl } from "./stripe";
import { renderEmail } from "@/i18n/emails";
import { isLocale, type Locale } from "@/i18n";

const DAY = 86_400_000;
const dayStart = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export function unsubscribeToken(userId: string) {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "dev").update(`unsub:${userId}`).digest("base64url").slice(0, 24);
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.AUTH_RESEND_KEY;
  if (!key || process.env.MOCK_AI === "1") {
    console.log(`[emails] (non envoyé) ${to} : ${subject}`);
    return true;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Alomundo <onboarding@resend.dev>", to, subject, html }),
  });
  if (!res.ok) console.error("[emails] échec", res.status, await res.text().catch(() => ""));
  return res.ok;
}

/** Relances du jour : série en danger, retour après 7 jours, fin de l'offre de bienvenue. Au plus 1 e-mail par personne et par jour. */
export async function runDailyEmails(now = new Date(), limit = 500) {
  const today = dayStart(now);
  const yesterday = new Date(today.getTime() - DAY);
  const weekAgo = new Date(today.getTime() - 7 * DAY);
  const base = { email: { not: null }, emailOptOut: false, OR: [{ lastEmailAt: null }, { lastEmailAt: { lt: today } }] };

  const candidates = await prisma.user.findMany({
    where: {
      ...base,
      AND: [{ OR: [
        { lastPracticeDay: yesterday, streakDays: { gte: 2 } },
        { lastPracticeDay: weekAgo },
        { createdAt: { gte: new Date(now.getTime() - 72 * 3_600_000), lt: new Date(now.getTime() - 48 * 3_600_000) } },
      ] }],
    },
    take: limit,
  });

  const sent = { streak: 0, comeback: 0, offer: 0 };
  for (const u of candidates) {
    const locale: Locale = isLocale(u.locale) ? u.locale : "fr";
    let kind: "streak" | "comeback" | "offer" | null = null;
    if (u.lastPracticeDay && u.lastPracticeDay.getTime() === yesterday.getTime() && u.streakDays >= 2) kind = "streak";
    else if (welcomeEndsAt(u, now) && welcomeEndsAt(u, now)!.getTime() - now.getTime() < DAY) kind = "offer";
    else if (u.lastPracticeDay && u.lastPracticeDay.getTime() === weekAgo.getTime() && tierOf(u, now) === "free") kind = "comeback";
    if (!kind || !u.email) continue;

    const links = {
      cta: `${appUrl()}${kind === "offer" ? "/abonnement" : "/parcours"}`,
      unsubscribe: `${appUrl()}/api/email/unsubscribe?u=${encodeURIComponent(u.id)}&s=${unsubscribeToken(u.id)}`,
    };
    const { subject, html } = renderEmail(locale, kind, { n: u.streakDays, p: welcomePercent() }, links);
    if (await send(u.email, subject, html)) {
      await prisma.user.update({ where: { id: u.id }, data: { lastEmailAt: now } });
      sent[kind]++;
    }
  }
  return sent;
}
