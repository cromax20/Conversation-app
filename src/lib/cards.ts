// Cartes (révision espacée) et quiz, tout au long des niveaux.

export const TOPICS = [
  { id: "greetings", emoji: "👋", fr: "saluer, se présenter, prendre congé" },
  { id: "family", emoji: "👨‍👩‍👧", fr: "la famille, les proches, les relations" },
  { id: "daily", emoji: "☀️", fr: "la vie quotidienne, la maison, les horaires" },
  { id: "food", emoji: "🍲", fr: "la nourriture, les plats typiques, au restaurant" },
  { id: "travel", emoji: "✈️", fr: "voyager, se déplacer, demander son chemin" },
  { id: "feelings", emoji: "💛", fr: "les émotions, la santé, comment on se sent" },
  { id: "opinions", emoji: "💭", fr: "donner son avis, être d'accord ou non, nuancer" },
  { id: "plans", emoji: "📅", fr: "les projets, les invitations, le temps et les dates" },
  { id: "culture", emoji: "🎭", fr: "les fêtes, les traditions, les expressions locales" },
  { id: "work", emoji: "💼", fr: "le travail, les études, les loisirs" },
] as const;
export type TopicId = (typeof TOPICS)[number]["id"];
export const isTopic = (v: string): v is TopicId => TOPICS.some((t) => t.id === v);

export type Card = { front: string; pronunciation: string; back: string; example: string };

// Révision espacée (boîtes de Leitner) : délai avant de revoir une carte, en jours.
const INTERVALS = [0, 1, 3, 7, 16];
export function nextReview(box: number, known: boolean, now = new Date()) {
  const next = known ? Math.min(5, box + 1) : 1;
  const days = known ? INTERVALS[next - 1] : 0;
  return { box: next, due: new Date(now.getTime() + days * 86_400_000 + (known ? 0 : 10 * 60_000)) };
}

export function limits() {
  const n = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
  return {
    cards: n(process.env.FREE_DAILY_CARDS, 20),
    quizzes: n(process.env.FREE_DAILY_QUIZZES, 3),
    decks: n(process.env.FREE_DAILY_DECKS, 2),
  };
}

export const QUIZ_LENGTH = 10;
export const XP_PER_CORRECT = 2;

export type QuizQuestion = { prompt: string; pronunciation: string; answer: string; options: string[]; direction: "toNative" | "toTarget" };

/** Construit un quiz à choix multiples à partir des cartes (aucun appel payant). */
export function buildQuiz(cards: Card[], rand: () => number = Math.random, length = QUIZ_LENGTH): QuizQuestion[] {
  const pool = cards.filter((c) => c.front && c.back);
  if (pool.length < 4) return [];
  const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  return shuffle(pool).slice(0, Math.min(length, pool.length)).map((c, i) => {
    const toNative = i % 2 === 0;
    const field = (x: Card) => (toNative ? x.back : x.front);
    const distractors = shuffle(pool.filter((x) => field(x) !== field(c))).slice(0, 3).map(field);
    return {
      prompt: toNative ? c.front : c.back,
      pronunciation: toNative ? c.pronunciation : "",
      answer: field(c),
      options: shuffle([field(c), ...distractors]),
      direction: toNative ? "toNative" : "toTarget",
    };
  });
}
