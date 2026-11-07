import Link from "next/link";
import { currentUser } from "@/lib/session";
import { dailyLimit, isPro } from "@/lib/plan";
import BillingButton from "@/components/BillingButton";

const PRICE_LABEL = process.env.NEXT_PUBLIC_PRICE_LABEL || "9 € / mois";
const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ merci?: string }> }) {
  const sp = await searchParams;
  const user = await currentUser();
  const pro = user ? isPro(user) : false;

  return (
    <main className="wrap">
      <header>
        <h1>{user ? "Abonnement" : "Tarifs"}</h1>
        <p className="lede">Commencez gratuitement. Passez à l'abonnement pour pratiquer sans compter et à voix haute.</p>
      </header>

      {sp.merci && (
        <p className="banner" role="status">
          {pro ? "Merci ! Votre abonnement est actif." : "Merci ! Le paiement est en cours de confirmation : actualisez la page dans quelques secondes."}
        </p>
      )}

      <div className="plans">
        <section className="plan">
          <h2>Gratuit</h2>
          <div className="price">0 €</div>
          <ul>
            <li>{dailyLimit(false)} réponses du personnage par jour</li>
            <li>20 langues, niveaux A1 à C1</li>
            <li>Historique des conversations</li>
          </ul>
          {!user && <Link className="ghost" href="/login?callbackUrl=/">Créer un compte</Link>}
          {user && !pro && <p className="muted small" style={{ margin: 0 }}>Votre formule actuelle.</p>}
        </section>

        <section className="plan pro">
          <h2>Abonnement</h2>
          <div className="price">{PRICE_LABEL}</div>
          <ul>
            <li>Jusqu'à {dailyLimit(true)} réponses par jour</li>
            <li>Voix naturelle : écoutez chaque réplique</li>
            <li>Dictée : répondez à l'oral</li>
            <li>Sans engagement, résiliable en un clic</li>
          </ul>
          {!user && <Link className="btn" href="/login?callbackUrl=/abonnement">Se connecter pour s'abonner</Link>}
          {user && !pro && <BillingButton kind="checkout" label="S'abonner" />}
          {user && pro && (
            <>
              <p className="small" style={{ margin: 0 }}>
                <span className="pill">ACTIF</span>{" "}
                {user.currentPeriodEnd && <>Prochaine échéance : {fmt.format(user.currentPeriodEnd)}</>}
              </p>
              <BillingButton kind="portal" label="Gérer l'abonnement et les factures" primary={false} />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
