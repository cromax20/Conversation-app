"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";

type Phrase = { text: string; pronunciation: string; translation: string };
type Result = { translation: string; pronunciation: string; note: string };

// Coup de pouce : phrases pour commencer et traduction depuis la langue de l'élève.
export default function Assist({ conversationId, beginner, nativeName, onUse, onRemaining }: {
  conversationId: string; beginner: boolean; nativeName: string; onUse: (text: string) => void; onRemaining: (n: number) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(beginner);
  const [phrases, setPhrases] = useState<Phrase[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [mine, setMine] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState("");
  const err = (code?: string) => (code && t.errors[code as keyof typeof t.errors]) || t.errors.reply_failed;

  const loadPhrases = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/conversations/${conversationId}/phrases`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(err(data?.error?.code));
      setPhrases(data.phrases);
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (open && !phrases && !loading && !error) void loadPhrases(); }, [open, phrases, loading, error, loadPhrases]);

  async function translateMine(e: React.FormEvent) {
    e.preventDefault();
    const text = mine.trim();
    if (!text) return;
    setTranslating(true); setError(""); setResult(null);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/translate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, direction: "toTarget" }) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(err(data?.error?.code));
      setResult(data); onRemaining(data.remaining);
    } catch (e) { setError((e as Error).message); } finally { setTranslating(false); }
  }

  return (
    <details className="assist" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)} data-testid="assist">
      <summary>{t.assist.title}</summary>
      <div className="stack" style={{ gap: 10, marginTop: 8 }}>
        <div>
          <span className="label">{t.assist.phrases}</span>
          {loading && <p className="muted small">{t.assist.loading}</p>}
          {phrases && (
            <>
              <p className="muted small" style={{ margin: "2px 0 6px" }}>{t.assist.phrasesHelp}</p>
              <ul className="phrases">
                {phrases.map((p) => (
                  <li key={p.text}>
                    <button type="button" onClick={() => onUse(p.text)}>
                      <b>{p.text}</b>
                      {p.pronunciation && <span className="pron">[{p.pronunciation}]</span>}
                      <span className="muted">{p.translation}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <form onSubmit={translateMine} className="stack" style={{ gap: 6 }}>
          <label className="label" htmlFor={`mine-${conversationId}`}>{t.assist.mine}</label>
          <div className="compose">
            <input id={`mine-${conversationId}`} type="text" maxLength={500} value={mine} onChange={(e) => setMine(e.target.value)} placeholder={t.assist.minePlaceholder(nativeName)} />
            <button className="ghost" type="submit" disabled={translating || !mine.trim()}>{translating ? t.assist.translating : t.assist.translate}</button>
          </div>
        </form>
        {result && (
          <div className="translation" data-testid="translation">
            <b>{result.translation}</b>
            {result.pronunciation && <span className="pron">[{result.pronunciation}]</span>}
            {result.note && <span className="muted small">{result.note}</span>}
            <button type="button" className="btn" onClick={() => { onUse(result.translation); setResult(null); setMine(""); }}>{t.assist.use}</button>
          </div>
        )}
        {error && <p className="muted small" role="alert">{error}</p>}
      </div>
    </details>
  );
}
