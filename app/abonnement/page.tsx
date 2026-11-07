import { currentUser } from "@/lib/session";
import { PRICES, TRIAL_DAYS, dailyLimit, isPro, tierOf } from "@/lib/plan";
import { callFreeLevel, freeCallMinutes } from "@/lib/calls";
import { getI18n } from "@/i18n/server";
import PlanPicker from "@/components/PlanPicker";

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ merci?: string }> }) {
  const sp = await searchParams;
  const { locale, t } = await getI18n();
  const user = await currentUser();
  const tier = user ? tierOf(user) : "free";
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "Europe/Paris" });

  return (
    <main className="wrap pricing">
      <header>
        <h1>{t.plans.title}</h1>
        <p className="lede">{t.plans.lede}</p>
      </header>

      {sp.merci && <p className="banner" role="status">{user && isPro(user) ? t.pricing.thanksActive : t.pricing.thanksPending}</p>}
      {user && tier !== "free" && (
        <p className="small" style={{ margin: 0 }} data-testid="current-plan">
          <span className="pill">{t.pricing.active}</span> {t.plans.current} : <b>{t.plans.names[tier]}</b>
          {user.subscriptionStatus === "trialing" && <> · 🎁 {t.plans.trial(TRIAL_DAYS.plus ?? 7)}</>}
          {user.currentPeriodEnd && <> · {t.pricing.nextBilling(fmt.format(user.currentPeriodEnd))}</>}
        </p>
      )}

      <PlanPicker
        signedIn={Boolean(user)}
        current={tier}
        canTrial={tier === "free" && (!user || (!user.hadTrial && !user.subscriptionId))}
        prices={PRICES}
        trialDays={TRIAL_DAYS}
        limits={{ free: dailyLimit("free"), essential: dailyLimit("essential"), plus: dailyLimit("plus"), premium: dailyLimit("premium") }}
        callMinutes={freeCallMinutes()}
        callLevel={callFreeLevel()}
      />
    </main>
  );
}
