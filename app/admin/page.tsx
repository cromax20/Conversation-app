import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { dashboard, isAdmin } from "@/lib/admin";
import { FREE_PAUSE_AT } from "@/lib/costs";

// Tableau de bord du propriétaire (ADMIN_EMAILS). Volontairement en français uniquement.
const eur = (v: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);
const pct = (v: number) => new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 }).format(v);
const NAMES = { essential: "Essentiel", plus: "Plus", premium: "Premium", free: "Gratuit" } as const;

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/login?callbackUrl=/admin");
  if (!isAdmin(user.email)) notFound();
  const d = await dashboard();

  return (
    <main className="wrap admin" data-testid="admin">
      <header>
        <h1>📊 Tableau de bord</h1>
        <p className="lede">Estimations du mois en cours (hors impôt sur le revenu). Les coûts IA sont mesurés appel par appel.</p>
      </header>

      <div className="plans">
        <section className="plan"><span className="label">Revenu mensuel récurrent</span><div className="price">{eur(d.mrr)}</div><span className="muted small">{d.paying} abonnés payants · {d.trials} en essai</span></section>
        <section className="plan"><span className="label">Coût IA du mois</span><div className="price">{eur(d.aiCost)}</div><span className="muted small">{d.paying ? `${eur(d.aiCost / d.paying)} par abonné` : "—"}</span></section>
        <section className="plan"><span className="label">Il vous reste (estimation)</span><div className="price" style={{ color: d.net >= 0 ? "var(--ok)" : "var(--stamp)" }}>{eur(d.net)}</div><span className="muted small">après IA, Stripe, frais fixes et cotisations</span></section>
        <section className="plan"><span className="label">Conversion</span><div className="price">{pct(d.conversion)}</div><span className="muted small">{d.totalUsers} inscrits · {d.signups30} sur 30 j · {d.active30} actifs</span></section>
      </div>

      {d.budget.budget && (
        <section className="card">
          <span className="label">Budget IA mensuel</span>
          <div className="progressline" style={{ height: 14 }}><div style={{ width: `${Math.min(100, d.budget.ratio * 100)}%`, background: d.budget.ratio >= FREE_PAUSE_AT ? "var(--stamp)" : undefined }} /></div>
          <span className="small">{eur(d.budget.spent)} / {eur(d.budget.budget)} · {d.budget.freePaused ? "⚠️ offre gratuite en pause" : `pause de l'offre gratuite à ${pct(FREE_PAUSE_AT)}`}</span>
        </section>
      )}

      <section className="card">
        <h2 style={{ margin: 0 }}>Abonnés par formule</h2>
        <table className="table">
          <thead><tr><th>Formule</th><th>Mensuel</th><th>Annuel</th><th>En essai</th><th>Coût IA</th></tr></thead>
          <tbody>
            {(["essential", "plus", "premium"] as const).map((t) => (
              <tr key={t}><td>{NAMES[t]}</td><td>{d.byTier[t].month}</td><td>{d.byTier[t].year}</td><td>{d.byTier[t].trial}</td><td>{eur(d.costByTier[t] ?? 0)}</td></tr>
            ))}
            <tr><td>Gratuit</td><td colSpan={3} className="muted">{d.totalUsers - d.paying - d.trials} comptes</td><td>{eur(d.costByTier.free ?? 0)}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2 style={{ margin: 0 }}>Détail du mois</h2>
        <table className="table">
          <tbody>
            <tr><td>Revenu mensuel récurrent</td><td>{eur(d.mrr)}</td></tr>
            <tr><td>Coût IA (Claude et voix)</td><td>− {eur(d.aiCost)}</td></tr>
            <tr><td>Frais Stripe (estimés)</td><td>− {eur(d.stripeFees)}</td></tr>
            <tr><td>Frais fixes (FIXED_MONTHLY_COSTS_EUR)</td><td>− {eur(d.fixed)}</td></tr>
            <tr><td>Cotisations sociales ({pct(d.chargesRate)})</td><td>− {eur(d.charges)}</td></tr>
            <tr><td><b>Il vous reste</b></td><td><b>{eur(d.net)}</b></td></tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
