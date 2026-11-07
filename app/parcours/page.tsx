import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { features, tierOf } from "@/lib/plan";
import { callFreeLevel } from "@/lib/calls";
import { accessFor } from "@/lib/calls-server";
import { nextLevel, palierInfo, currentStreak, PALIERS_PER_LEVEL } from "@/lib/progress";
import { buildPath } from "@/lib/path";
import { themeFor } from "@/lib/themes";
import { type Level } from "@/lib/characters";
import { getI18n } from "@/i18n/server";
import { storedLanguageLabel } from "@/i18n";
import Scenery from "@/components/Scenery";
import ExamButton from "@/components/ExamButton";
import ScrollToCurrent from "@/components/ScrollToCurrent";

export default async function PathPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?callbackUrl=/parcours");
  const { locale, t } = await getI18n();
  const sp = await searchParams;

  const all = await prisma.languageProgress.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
  const streak = currentStreak(user);
  const pro = features(tierOf(user)).calls;

  if (all.length === 0) {
    return (
      <main className="wrap">
        <h1>{t.path.title}</h1>
        <p className="lede">{t.path.lede}</p>
        <p className="muted">{t.path.empty} <Link href="/">{t.path.startOne}</Link>.</p>
      </main>
    );
  }

  const p = all.find((x) => x.key === sp.lang) ?? all[0];
  const code = p.key.startsWith("custom:") ? "custom" : p.key;
  const theme = themeFor(code);
  const callLevel = callFreeLevel();
  const callOk = (await accessFor(user.id, user, p)) !== "locked";
  const nodes = buildPath(p, [...theme.landmarks, ...theme.dishes], callLevel, callOk);
  const info = palierInfo(p.xp);
  const label = (k: string, name: string) => storedLanguageLabel(k.startsWith("custom:") ? "custom" : k, name, locale);
  const practiceHref = p.key.startsWith("custom:") ? "/" : `/?lang=${encodeURIComponent(p.key)}`;

  return (
    <main className="wrap">
      <header>
        <h1>{t.path.title}</h1>
        <p className="lede">{t.path.lede}</p>
      </header>

      <div className="plans">
        <section className="plan"><span className="label">{t.path.streak}</span><div className="price">{streak} 🔥</div><span className="muted small">{t.path.days(streak)} · {t.path.record(user.bestStreak)}</span></section>
        <section className="plan"><span className="label">{t.path.languages}</span><div className="price">{all.length}</div><span className="muted small">{t.path.totalXp(all.reduce((a, x) => a + x.totalXp, 0))}</span></section>
      </div>

      {all.length > 1 && (
        <nav className="chips" aria-label={t.path.chooseLanguage}>
          {all.map((x) => (
            <Link key={x.id} className="chip" aria-pressed={x.id === p.id} href={`/parcours?lang=${encodeURIComponent(x.key)}`}>{label(x.key, x.languageName)} · {x.level}</Link>
          ))}
        </nav>
      )}

      <Link className="ghost" href={`/cartes?lang=${encodeURIComponent(p.key)}`}>🃏 {t.cards.nav}</Link>

      {pro && (
        <Link className="callbanner" href={`/appel/nouveau?key=${encodeURIComponent(p.key)}`}>📹 {t.path.callReady}</Link>
      )}

      <section className="path" data-testid="path" style={{ ["--c1" as string]: theme.colors[0], ["--c2" as string]: theme.colors[1], ["--c3" as string]: theme.colors[2] }}>
        <Scenery className="path-bg" scenery={theme.scenery} time={theme.time} accent={theme.colors[0]} />
        <div className="path-veil" />
        <div className="path-head">
          <strong>{label(p.key, p.languageName)}</strong>
          <span className="pill">{p.level}</span>
          <span className="small">{t.levelTitles[p.level as Level]} · {t.path.palier(info.palier)}/{PALIERS_PER_LEVEL} · {info.examReady ? t.path.examReady : t.path.palierProgress(info.intoPalier, info.palierSize)}</span>
          <div className="stickers" aria-hidden="true">{[...theme.landmarks, ...theme.dishes].map((s) => <span key={s.label} title={s.label}>{s.emoji}</span>)}</div>
        </div>
        <ol className="path-list">
          {nodes.map((n, i) => {
            const side = ["c", "r", "c", "l"][i % 4];
            const isCurrent = n.state === "current";
            let icon = "🔒", title = "", sub = "";
            if (n.kind === "tier") {
              icon = n.state === "done" || n.state === "skipped" ? n.sticker.emoji : isCurrent ? "⭐" : "🔒";
              title = `${n.level} · ${t.path.palier(n.tier)}`;
              sub = n.state === "done" ? n.sticker.label : n.state === "skipped" ? t.path.skipped : isCurrent ? t.path.current : "";
            } else if (n.kind === "exam") {
              icon = n.state === "done" || n.state === "skipped" ? "🎓" : isCurrent ? "🎓" : "🔒";
              title = t.path.exam(n.target);
              sub = isCurrent ? t.path.examReady : n.state === "done" ? t.path.done : "";
            } else if (n.kind === "call") {
              icon = n.state === "done" ? "📹" : "🔒";
              title = `${t.path.call} · ${n.level}`;
              sub = n.state === "done" ? "" : t.path.callLocked;
            } else {
              icon = "🏆"; title = t.path.trophy; sub = n.state === "done" ? t.path.trophyDone : "";
            }
            return (
              <li key={i} className={`node node-${n.kind} ${n.state} side-${side}`} id={isCurrent ? "ici" : undefined} data-state={n.state} data-kind={n.kind}>
                <span className="bubble" aria-hidden="true">{icon}</span>
                <span className="node-text">
                  <b>{title}</b>
                  {sub && <span className="small">{sub}</span>}
                  {n.kind === "tier" && isCurrent && <Link className="ghost small" href={practiceHref}>{t.path.practice}</Link>}
                  {n.kind === "exam" && isCurrent && nextLevel(p.level) && <ExamButton progressKey={p.key} target={n.target} />}
                  {n.kind === "call" && n.state === "done" && <Link className="btn small" href={`/appel/nouveau?key=${encodeURIComponent(p.key)}`}>{t.path.callReady}</Link>}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
      <ScrollToCurrent />
    </main>
  );
}
