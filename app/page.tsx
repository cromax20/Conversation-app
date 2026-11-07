import { auth } from "@/auth";
import { getI18n } from "@/i18n/server";
import Configurator from "@/components/Configurator";

export default async function Home() {
  const session = await auth();
  const { t } = await getI18n();
  return (
    <main className="wrap">
      <header>
        <h1>{t.home.title}</h1>
        <p className="lede">{t.home.lede}</p>
      </header>
      <Configurator signedIn={Boolean(session?.user)} />
    </main>
  );
}
