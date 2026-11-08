import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getI18n } from "@/i18n/server";
import { isRtl } from "@/i18n";
import { I18nProvider } from "@/i18n/client";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { isAdmin } from "@/lib/admin";
import { currentUser } from "@/lib/session";
import { welcomeEndsAt, welcomePercent } from "@/lib/growth";
import RefCapture from "@/components/RefCapture";
import OfferBar from "@/components/OfferBar";
import { Figtree, JetBrains_Mono, Young_Serif } from "next/font/google";
import PauseHidden from "@/components/PauseHidden";
import "./globals.css";

// Polices hébergées avec le site (pas de requête vers Google à chaque visite), sous-ensembles utiles seulement.
const display = Young_Serif({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-display", display: "swap" });
const body = Figtree({ subsets: ["latin", "latin-ext"], variable: "--font-body", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: `${t.meta.title} · ${t.meta.tagline}`, description: t.meta.description, applicationName: "Alomundo" };
}
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const { locale, t } = await getI18n();
  const me = session?.user ? await currentUser() : null;
  const offerEnds = me ? welcomeEndsAt(me) : null;
  return (
    <html lang={locale} dir={isRtl(locale) ? "rtl" : "ltr"} className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <PauseHidden />
        <I18nProvider locale={locale}>
          <RefCapture />
          {offerEnds && <OfferBar endsAt={offerEnds.getTime()} percent={welcomePercent()} />}
          <header className="topbar">
            <Link href="/" className="brand" aria-label={`${t.nav.brand} — ${t.meta.tagline}`}><span className="logo" aria-hidden="true">📞</span>{t.nav.brand}<span className="tagline">{t.meta.tagline}</span></Link>
            <nav className="nav" aria-label="Navigation">
              {session?.user ? (
                <>
                  <Link href="/parcours">{t.nav.path}</Link>
                  <Link href="/cartes">{t.cards.nav}</Link>
                  <Link href="/conversations">{t.nav.conversations}</Link>
                  <Link href="/abonnement">{t.nav.subscription}</Link>
                  <Link href="/parrainage">{t.growth.refNav}</Link>
                  {isAdmin(session.user.email) && <Link href="/admin">📊</Link>}
                  <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
                    <button className="linkbtn" type="submit">{t.nav.logout}</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/abonnement">{t.nav.pricing}</Link>
                  <Link href="/login">{t.nav.login}</Link>
                </>
              )}
              <LocaleSwitcher />
            </nav>
          </header>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
