"use client";

import { useState } from "react";
import Link from "next/link";
import type { Interval, PaidTier, Tier } from "@/lib/plan";
import { useI18n } from "@/i18n/client";

type Props = {
  signedIn: boolean;
  current: Tier;
  canTrial: boolean;
  prices: Record<PaidTier, Record<Interval, number>>;
  limits: Record<Tier, number>;
  trialDays: Partial<Record<PaidTier, number>>;
  callMinutes: number;
  callLevel: string;
  welcomePercent: number; // réduction de bienvenue sur la 1re année (0 = aucune)
};

const TIERS: Tier[] = ["free", "essential", "plus", "premium"];

export default function PlanPicker(p: Props) {
  const { locale, t } = useI18n();
  const [interval, setInterval] = useState<Interval>("year");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const money = (v: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: v % 1 ? 2 : 0 }).format(v);
  const errText = (code?: string) => (code && t.errors[code as keyof typeof t.errors]) || t.pricing.error;

  async function go(kind: "checkout" | "portal", tier?: PaidTier) {
    setBusy(tier ?? kind); setError("");
    const res = await fetch(`/api/billing/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tier ? { tier, interval } : {}) });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.url) { window.location.href = data.url; return; }
    setError(errText(data?.error?.code)); setBusy(null);
  }

  const paid = p.current !== "free";

  return (
    <>
      <div className="billing-toggle" role="radiogroup" aria-label={`${t.plans.monthly} / ${t.plans.yearly}`}>
        <button type="button" role="radio" aria-checked={interval === "month"} onClick={() => setInterval("month")}>{t.plans.monthly}</button>
        <button type="button" role="radio" aria-checked={interval === "year"} onClick={() => setInterval("year")}>{t.plans.yearly} <span className="save">{t.plans.yearlySave}</span></button>
      </div>

      <div className="tiers">
        {TIERS.map((tier) => {
          const isCurrent = p.current === tier;
          const price = tier === "free" ? 0 : p.prices[tier][interval];
          const trial = tier !== "free" && p.canTrial ? p.trialDays[tier] : undefined;
          return (
            <section key={tier} className={`tier tier-${tier} ${tier === "plus" ? "featured" : ""} ${isCurrent ? "current" : ""}`} data-testid={`tier-${tier}`}>
              {tier === "plus" && <span className="ribbon">{t.plans.popular}</span>}
              <h2>{t.plans.names[tier]}</h2>
              <p className="muted small" style={{ margin: 0 }}>{t.plans.taglines[tier]}</p>
              {tier !== "free" && interval === "year" && p.welcomePercent > 0 && (
                <span className="was" data-testid={`was-${tier}`}><s>{money(price)}</s> −{p.welcomePercent} %</span>
              )}
              <div className="price">
                {money(tier !== "free" && interval === "year" && p.welcomePercent > 0 ? Math.round(price * (100 - p.welcomePercent)) / 100 : price)}<span className="per">{tier === "free" ? "" : interval === "month" ? ` ${t.plans.perMonth}` : ` ${t.plans.perYear}`}</span>
              </div>
              {tier !== "free" && interval === "year" && <span className="muted small">{t.plans.equiv(money(Math.round((price / 12) * 100) / 100))}</span>}
              {trial && <span className="trial-badge">🎁 {t.plans.trial(trial)}</span>}
              <ul>{t.plans.features[tier](p.limits[tier], p.callMinutes, p.callLevel).map((f) => <li key={f}>{f}</li>)}</ul>
              <div className="tier-cta">
                {isCurrent ? (
                  <span className="pill">{t.plans.current}</span>
                ) : tier === "free" ? (
                  !p.signedIn && <Link className="ghost" href="/login?callbackUrl=/">{t.pricing.createAccount}</Link>
                ) : !p.signedIn ? (
                  <Link className={tier === "plus" ? "btn btn-glow" : "btn"} href="/login?callbackUrl=/abonnement">{trial ? t.plans.startTrial(trial) : t.plans.choose}</Link>
                ) : paid ? (
                  <button type="button" className="ghost" onClick={() => go("portal")} disabled={busy !== null}>{t.plans.manage}</button>
                ) : (
                  <button type="button" className={tier === "plus" ? "btn btn-glow" : "btn"} onClick={() => go("checkout", tier)} disabled={busy !== null}>
                    {busy === tier ? t.pricing.redirecting : trial ? t.plans.startTrial(trial) : t.plans.choose}
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
      {error && <p className="msg note" role="alert">{error}</p>}
      {paid && <button type="button" className="ghost" style={{ justifySelf: "center" }} onClick={() => go("portal")} disabled={busy !== null}>{t.plans.manage}</button>}
      <p className="muted small" style={{ textAlign: "center", margin: 0 }}>{t.plans.vat}</p>
    </>
  );
}
