import { auth } from "@/auth";
import Configurator from "@/components/Configurator";

export default async function Home() {
  const session = await auth();
  return (
    <main className="wrap home">
      <Configurator signedIn={Boolean(session?.user)} />
    </main>
  );
}
