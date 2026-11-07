import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { ensureReferralCode, referralAmountEur } from "@/lib/growth";
import { appUrl } from "@/lib/stripe";
import { getI18n } from "@/i18n/server";
import ReferralShare from "@/components/ReferralShare";

export default async function ReferralPage() {
  const user = await currentUser();
  if (!user) redirect("/login?callbackUrl=/parrainage");
  const { locale, t } = await getI18n();
  const code = await ensureReferralCode(user.id);
  const [invited, converted] = await Promise.all([
    prisma.user.count({ where: { referredBy: code } }),
    prisma.user.count({ where: { referredBy: code, referralRewarded: true } }),
  ]);
  const money = (v: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
  const amount = money(referralAmountEur());

  return (
    <main className="wrap">
      <header>
        <h1>🎁 {t.growth.refTitle}</h1>
        <p className="lede">{t.growth.refLede(amount)}</p>
      </header>
      <section className="card"><ReferralShare link={`${appUrl()}/?ref=${code}`} amount={amount} /></section>
      <div className="plans">
        <section className="plan"><span className="label">{t.growth.refInvited}</span><div className="price" data-testid="ref-invited">{invited}</div></section>
        <section className="plan"><span className="label">{t.growth.refConverted}</span><div className="price">{converted}</div></section>
        <section className="plan"><span className="label">{t.growth.refCredits}</span><div className="price">{money(user.referralCredits / 100)}</div></section>
      </div>
    </main>
  );
}
