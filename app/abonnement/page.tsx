import Link from "next/link";
import { currentUser } from "@/lib/session";
import { dailyLimit, isPro } from "@/lib/plan";
import { getI18n } from "@/i18n/server";
import BillingButton from "@/components/BillingButton";

const PRICE_LABEL = process.env.NEXT_PUBLIC_PRICE_LABEL || "9 € / mois";

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ merci?: string }> }) {
  const sp = await searchParams;
  const { locale, t } = await getI18n();
  const user = await currentUser();
  const pro = user ? isPro(user) : false;
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "Europe/Paris" });

  return (
    <main className="wrap">
      <header>
        <h1>{user ? t.pricing.titleSignedIn : t.pricing.titleSignedOut}</h1>
        <p className="lede">{t.pricing.lede}</p>
      </header>

      {sp.merci && <p className="banner" role="status">{pro ? t.pricing.thanksActive : t.pricing.thanksPending}</p>}

      <div className="plans">
        <section className="plan">
          <h2>{t.pricing.free}</h2>
          <div className="price">{t.pricing.freePrice}</div>
          <ul>{t.pricing.freeFeatures(dailyLimit(false)).map((f) => <li key={f}>{f}</li>)}</ul>
          {!user && <Link className="ghost" href="/login?callbackUrl=/">{t.pricing.createAccount}</Link>}
          {user && !pro && <p className="muted small" style={{ margin: 0 }}>{t.pricing.current}</p>}
        </section>

        <section className="plan pro">
          <h2>{t.pricing.pro}</h2>
          <div className="price">{PRICE_LABEL}</div>
          <ul>{t.pricing.proFeatures(dailyLimit(true)).map((f) => <li key={f}>{f}</li>)}</ul>
          {!user && <Link className="btn" href="/login?callbackUrl=/abonnement">{t.pricing.signInToSubscribe}</Link>}
          {user && !pro && <BillingButton kind="checkout" label={t.pricing.subscribe} />}
          {user && pro && (
            <>
              <p className="small" style={{ margin: 0 }}>
                <span className="pill">{t.pricing.active}</span>{" "}
                {user.currentPeriodEnd && t.pricing.nextBilling(fmt.format(user.currentPeriodEnd))}
              </p>
              <BillingButton kind="portal" label={t.pricing.manage} primary={false} />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
