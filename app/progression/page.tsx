import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { LEVEL_ORDER, type Level } from "@/lib/characters";
import { LEVEL_TITLES, PALIERS_PER_LEVEL, currentStreak, nextLevel, palierInfo } from "@/lib/progress";
import ExamButton from "@/components/ExamButton";

export default async function ProgressPage() {
  const user = await currentUser();
  if (!user) redirect("/login?callbackUrl=/progression");

  const progress = await prisma.languageProgress.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
  const streak = currentStreak(user);

  return (
    <main className="wrap">
      <header>
        <h1>Ma progression</h1>
        <p className="lede">Chaque réponse rapporte des points. Franchissez les {PALIERS_PER_LEVEL} paliers d'un niveau, puis réussissez l'épreuve de passage pour monter au niveau suivant.</p>
      </header>

      <div className="plans">
        <section className="plan"><span className="label">Série en cours</span><div className="price">{streak} 🔥</div><span className="muted small">jour{streak > 1 ? "s" : ""} d'affilée · record {user.bestStreak}</span></section>
        <section className="plan"><span className="label">Langues pratiquées</span><div className="price">{progress.length}</div><span className="muted small">{progress.reduce((a, p) => a + p.totalXp, 0)} XP au total</span></section>
      </div>

      {progress.length === 0 ? (
        <p className="muted">Aucune langue pour l'instant. <Link href="/">Commencez une conversation</Link>.</p>
      ) : (
        <ul className="list">
          {progress.map((p) => {
            const info = palierInfo(p.xp);
            const target = nextLevel(p.level);
            const idx = LEVEL_ORDER.indexOf(p.level as Level);
            return (
              <li key={p.id} style={{ display: "grid", gap: 10 }} data-testid="progress-card">
                <div className="row">
                  <strong>{p.languageName}</strong>
                  <span><span className="pill">{p.level}</span> <span className="muted small">{LEVEL_TITLES[p.level as Level]}</span></span>
                </div>
                <div className="row small">
                  <span>Palier {info.palier}/{PALIERS_PER_LEVEL} · {info.palierName}</span>
                  <span className="muted">{info.examReady ? "Épreuve débloquée" : `${info.intoPalier}/${info.palierSize} XP`}</span>
                </div>
                <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={info.percentToExam} aria-label="Progression vers l'épreuve"
                  style={{ height: 10, background: "var(--code)", border: "1px solid var(--line)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${info.percentToExam}%`, height: "100%", background: "var(--accent)" }} />
                </div>
                <div className="row small muted">
                  <span>{LEVEL_ORDER.map((l, i) => (i < idx ? "●" : i === idx ? "◉" : "○")).join(" ")}  A1 → C2</span>
                  <span>{p.totalXp} XP</span>
                </div>
                {target && info.examReady && <ExamButton progressKey={p.key} target={target} />}
                {!target && <span className="small">🏆 Niveau maximal atteint. Bravo !</span>}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
