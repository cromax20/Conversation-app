import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { canCall, callFreeLevel } from "@/lib/calls";
import { DEFAULT_AVATAR } from "@/lib/avatar";
import { languageByCode } from "@/lib/characters";
import { themeFor } from "@/lib/themes";
import { getI18n } from "@/i18n/server";
import { storedLanguageLabel } from "@/i18n";
import CallSetup from "@/components/CallSetup";

export default async function NewCallPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const sp = await searchParams;
  const user = await currentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/appel/nouveau?key=${sp.key ?? ""}`)}`);
  const { locale, t } = await getI18n();

  const progress = sp.key
    ? await prisma.languageProgress.findUnique({ where: { userId_key: { userId: user.id, key: sp.key } } })
    : await prisma.languageProgress.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
  if (!progress) redirect("/parcours");

  if (!canCall(user, progress)) {
    return (
      <main className="wrap">
        <h1>🔒 {t.call.lockedTitle}</h1>
        <p className="lede">{t.errors.call_locked} ({callFreeLevel()})</p>
        <p><Link className="btn" href="/abonnement">{t.chat.seePlan}</Link> <Link className="ghost" href="/parcours">{t.call.back}</Link></p>
      </main>
    );
  }

  const code = progress.key.startsWith("custom:") ? "custom" : progress.key;
  const lang = languageByCode(code);
  const theme = themeFor(code);
  const label = storedLanguageLabel(code, progress.languageName, locale);

  return (
    <main className="wrap">
      <header>
        <h1>{t.call.setupTitle}</h1>
        <p className="lede">{t.call.setupLede}</p>
      </header>
      <CallSetup
        progressKey={progress.key}
        languageLabel={label}
        theme={theme}
        defaults={{
          avatar: { ...DEFAULT_AVATAR, scenery: "country", time: theme.time },
          name: lang?.names[0] ?? "",
          place: lang?.cities[0] ?? "",
        }}
      />
    </main>
  );
}
