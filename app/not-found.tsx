import Link from "next/link";
export default function NotFound() {
  return (
    <main className="wrap">
      <h1>Page introuvable</h1>
      <p className="lede"><Link href="/">Retour à l'accueil</Link></p>
    </main>
  );
}
