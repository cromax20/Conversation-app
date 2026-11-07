import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { cardsUsage } from "@/lib/cards-server";
import { isTopic, type Card, type TopicId } from "@/lib/cards";
import { themeFor } from "@/lib/themes";
import { getI18n } from "@/i18n/server";
import { storedLanguageLabel } from "@/i18n";
import CardsStudio from "@/components/CardsStudio";

export default async function CardsPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?callbackUrl=/cartes");
  const { locale, t } = await getI18n();
  const sp = await searchParams;

  const all = await prisma.languageProgress.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
  if (all.length === 0) {
    return (
      <main className="wrap">
        <h1>{t.cards.title}</h1>
        <p className="lede">{t.cards.lede}</p>
        <p className="muted">{t.path.empty} <Link href="/">{t.path.startOne}</Link>.</p>
      </main>
    );
  }
  const p = all.find((x) => x.key === sp.lang) ?? all[0];
  const code = p.key.startsWith("custom:") ? "custom" : p.key;
  const theme = themeFor(code);
  const now = new Date();
  const decks = await prisma.deck.findMany({ where: { userId: user.id, key: p.key, level: p.level }, include: { reviews: true }, orderBy: { createdAt: "asc" } });
  const usage = await cardsUsage(user.id, user);
  const label = (k: string, name: string) => storedLanguageLabel(k.startsWith("custom:") ? "custom" : k, name, locale);

  return (
    <main className="wrap" style={{ ["--c1" as string]: theme.colors[0], ["--c3" as string]: theme.colors[2] }}>
      <header>
        <h1>🃏 {t.cards.title}</h1>
        <p className="lede">{t.cards.lede}</p>
      </header>
      {all.length > 1 && (
        <nav className="chips" aria-label={t.path.chooseLanguage}>
          {all.map((x) => (
            <Link key={x.id} className="chip" aria-pressed={x.id === p.id} href={`/cartes?lang=${encodeURIComponent(x.key)}`}>{label(x.key, x.languageName)} · {x.level}</Link>
          ))}
        </nav>
      )}
      <p className="small" style={{ margin: 0 }}><b>{label(p.key, p.languageName)}</b> · <span className="pill">{p.level}</span></p>
      <CardsStudio
        progressKey={p.key}
        level={p.level}
        pro={usage.pro}
        usage={usage}
        decks={decks.filter((d) => isTopic(d.topic)).map((d) => {
          const cards = (Array.isArray(d.cards) ? d.cards : []) as Card[];
          const reviewed = new Map(d.reviews.map((r) => [r.index, r]));
          const due = cards.map((_, i) => i).filter((i) => { const r = reviewed.get(i); return !r || r.due <= now; });
          return { id: d.id, topic: d.topic as TopicId, cards, due };
        })}
      />
    </main>
  );
}
