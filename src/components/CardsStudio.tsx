"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TOPICS, buildQuiz, QUIZ_LENGTH, XP_PER_CORRECT, type Card, type QuizQuestion, type TopicId } from "@/lib/cards";
import { useI18n } from "@/i18n/client";

type Deck = { id: string; topic: TopicId; cards: Card[]; due: number[] };
type Props = {
  progressKey: string; level: string; pro: boolean; decks: Deck[];
  usage: { cards: number; quizzes: number; decks: number; limits: { cards: number; quizzes: number; decks: number } };
};

export default function CardsStudio(p: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [busyTopic, setBusyTopic] = useState<string | null>(null);
  const [error, setError] = useState<{ text: string; upgrade?: boolean } | null>(null);
  const [study, setStudy] = useState<{ deck: Deck; queue: number[]; pos: number; flipped: boolean; done: number } | null>(null);
  const [quiz, setQuiz] = useState<{ qs: QuizQuestion[]; i: number; picked: string | null; correct: number; finished: boolean; xp: number } | null>(null);
  const byTopic = useMemo(() => new Map(p.decks.map((d) => [d.topic, d])), [p.decks]);
  const allCards = useMemo(() => p.decks.flatMap((d) => d.cards), [p.decks]);

  const fail = (code?: string) => setError({ text: (code && t.errors[code as keyof typeof t.errors]) || t.errors.reply_failed, upgrade: Boolean(code?.endsWith("_limit")) });

  async function createDeck(topic: TopicId) {
    setBusyTopic(topic); setError(null);
    const res = await fetch("/api/decks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: p.progressKey, topic }) });
    const data = await res.json().catch(() => null);
    setBusyTopic(null);
    if (!res.ok) return fail(data?.error?.code);
    router.refresh();
  }

  function startStudy(deck: Deck) {
    const queue = deck.due.length ? deck.due : deck.cards.map((_, i) => i);
    setStudy({ deck, queue, pos: 0, flipped: false, done: 0 });
  }

  async function answer(known: boolean) {
    if (!study) return;
    const index = study.queue[study.pos];
    const res = await fetch("/api/cards/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deckId: study.deck.id, index, known }) });
    const data = await res.json().catch(() => null);
    if (!res.ok) { setStudy(null); return fail(data?.error?.code); }
    // Une carte ratée revient à la fin de la séance.
    const queue = known ? study.queue : [...study.queue, index];
    setStudy({ ...study, queue, pos: study.pos + 1, flipped: false, done: study.done + 1 });
  }

  async function startQuiz() {
    setError(null);
    const qs = buildQuiz(allCards);
    if (!qs.length) return setError({ text: t.cards.quizNeed });
    const res = await fetch("/api/quiz/start", { method: "POST" });
    const data = await res.json().catch(() => null);
    if (!res.ok) return fail(data?.error?.code);
    setQuiz({ qs, i: 0, picked: null, correct: 0, finished: false, xp: 0 });
  }

  async function nextQuestion() {
    if (!quiz) return;
    if (quiz.i + 1 < quiz.qs.length) return setQuiz({ ...quiz, i: quiz.i + 1, picked: null });
    const res = await fetch("/api/quiz/finish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: p.progressKey, correct: quiz.correct }) });
    const data = await res.json().catch(() => null);
    setQuiz({ ...quiz, finished: true, xp: res.ok ? data.reward?.xp ?? quiz.correct * XP_PER_CORRECT : 0 });
  }

  // ---- Révision ----
  if (study) {
    const finished = study.pos >= study.queue.length;
    const card = finished ? null : study.deck.cards[study.queue[study.pos]];
    return (
      <section className="studio card">
        <div className="row"><span className="label">{TOPICS.find((x) => x.id === study.deck.topic)?.emoji} {t.cards.topics[study.deck.topic]}</span>
          <button type="button" className="ghost" onClick={() => { setStudy(null); router.refresh(); }}>{t.cards.close}</button></div>
        {finished ? (
          <p className="banner" role="status" data-testid="session-done">{t.cards.sessionDone(study.done)}</p>
        ) : card && (
          <>
            <div className="progressline"><div style={{ width: `${(study.pos / study.queue.length) * 100}%` }} /></div>
            <button type="button" className={`flashcard ${study.flipped ? "flipped" : ""}`} onClick={() => setStudy({ ...study, flipped: !study.flipped })} aria-label={t.cards.flip} data-testid="flashcard">
              <span className="face front"><b>{card.front}</b>{card.pronunciation && <span className="pron">[{card.pronunciation}]</span>}</span>
              <span className="face back"><b>{card.back}</b>{card.example && <span className="muted small">{t.cards.example} : {card.example}</span>}</span>
            </button>
            <p className="muted small" style={{ textAlign: "center", margin: 0 }}>{t.cards.flip}</p>
            <div className="row" style={{ justifyContent: "center" }}>
              <button type="button" className="ghost" onClick={() => answer(false)} disabled={!study.flipped}>{t.cards.again}</button>
              <button type="button" className="btn" onClick={() => answer(true)} disabled={!study.flipped}>{t.cards.known}</button>
            </div>
          </>
        )}
      </section>
    );
  }

  // ---- Quiz ----
  if (quiz) {
    const q = quiz.qs[quiz.i];
    return (
      <section className="studio card" data-testid="quiz">
        <div className="row"><span className="label">{t.cards.question(quiz.i + 1, quiz.qs.length)}</span>
          <button type="button" className="ghost" onClick={() => { setQuiz(null); router.refresh(); }}>{t.cards.close}</button></div>
        {quiz.finished ? (
          <p className="banner quiz-result" role="status" data-testid="quiz-result">🎉 {t.cards.result(quiz.correct, quiz.qs.length, quiz.xp)}</p>
        ) : (
          <>
            <div className="progressline"><div style={{ width: `${(quiz.i / quiz.qs.length) * 100}%` }} /></div>
            <span className="muted small">{q.direction === "toNative" ? t.cards.whatMeans : t.cards.howSay}</span>
            <p className="quiz-prompt"><b>{q.prompt}</b>{q.pronunciation && <span className="pron"> [{q.pronunciation}]</span>}</p>
            <div className="quiz-options">
              {q.options.map((o) => {
                const state = quiz.picked === null ? "" : o === q.answer ? "right" : o === quiz.picked ? "wrong" : "dim";
                return (
                  <button key={o} type="button" className={`option ${state}`} disabled={quiz.picked !== null}
                    onClick={() => setQuiz({ ...quiz, picked: o, correct: quiz.correct + (o === q.answer ? 1 : 0) })}>{o}</button>
                );
              })}
            </div>
            {quiz.picked !== null && (
              <div className="row">
                <span role="status" className={quiz.picked === q.answer ? "ok" : "ko"}>{quiz.picked === q.answer ? t.cards.correct : t.cards.wrong(q.answer)}</span>
                <button type="button" className="btn" onClick={nextQuestion}>{t.cards.next}</button>
              </div>
            )}
          </>
        )}
      </section>
    );
  }

  // ---- Tableau des paquets ----
  return (
    <>
      <div className={`banner ${p.pro ? "" : "limits"}`} data-testid="limits">
        {p.pro ? t.cards.unlimited : (
          <>
            {t.cards.limits(p.usage.limits.cards, p.usage.limits.quizzes, p.usage.limits.decks)}{" "}
            <span className="muted small">({p.usage.cards}/{p.usage.limits.cards} · {p.usage.quizzes}/{p.usage.limits.quizzes} · {p.usage.decks}/{p.usage.limits.decks})</span>{" "}
            <Link href="/abonnement">{t.cards.seePlan}</Link>
          </>
        )}
      </div>
      <button type="button" className="btn btn-glow" onClick={startQuiz} disabled={allCards.length < 4}>{t.cards.quiz}{allCards.length >= 4 ? ` · ${Math.min(QUIZ_LENGTH, allCards.length)} Q` : ""}</button>
      {allCards.length < 4 && <p className="muted small" style={{ margin: 0 }}>{t.cards.quizNeed}</p>}
      {error && <p className="msg note" role="alert">{error.text} {error.upgrade && !p.pro && <Link href="/abonnement">{t.cards.seePlan}</Link>}</p>}
      <div className="decks">
        {TOPICS.map((topic) => {
          const deck = byTopic.get(topic.id);
          return (
            <article key={topic.id} className={`deck ${deck ? "has" : ""}`} data-testid={`deck-${topic.id}`}>
              <span className="deck-emoji" aria-hidden="true">{topic.emoji}</span>
              <h3>{t.cards.topics[topic.id]}</h3>
              {deck ? (
                <>
                  <span className="muted small">{t.cards.cardsCount(deck.cards.length)}</span>
                  <button type="button" className={deck.due.length ? "btn" : "ghost"} onClick={() => startStudy(deck)}>
                    {deck.due.length ? t.cards.review(deck.due.length) : t.cards.upToDate}
                  </button>
                </>
              ) : (
                <button type="button" className="ghost" onClick={() => createDeck(topic.id)} disabled={busyTopic !== null}>
                  {busyTopic === topic.id ? t.cards.creating : t.cards.create}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
