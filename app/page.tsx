import { auth } from "@/auth";
import Configurator from "@/components/Configurator";

export default async function Home() {
  const session = await auth();
  return (
    <main className="wrap">
      <header>
        <h1>Atelier de personnages</h1>
        <p className="lede">Décrivez une situation, choisissez une langue, et discutez avec un personnage qui vous fait pratiquer, à l'écrit ou à voix haute.</p>
      </header>
      <Configurator signedIn={Boolean(session?.user)} />
    </main>
  );
}
