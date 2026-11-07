import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atelier de personnages",
  description: "Pratiquez une langue en discutant avec des personnages, à l'écrit ou à voix haute.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Young+Serif&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" />
      </head>
      <body>
        <header className="topbar">
          <Link href="/" className="brand">Atelier de personnages</Link>
          <nav className="nav" aria-label="Navigation principale">
            {session?.user ? (
              <>
                <Link href="/conversations">Mes conversations</Link>
                <Link href="/progression">Progression</Link>
                <Link href="/abonnement">Abonnement</Link>
                <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
                  <button className="linkbtn" type="submit">Déconnexion</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/abonnement">Tarifs</Link>
                <Link href="/login">Connexion</Link>
              </>
            )}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
