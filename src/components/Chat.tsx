"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Msg = { id: string; role: "user" | "assistant"; text: string };

type ExamResult = { passed: boolean; score: number; summary: string; strengths: string[]; improvements: string[] };
type Reward = { xp: number; level: string; palier: number; palierUp: boolean; examReady: boolean; examJustUnlocked: boolean; streakDays: number };

type Props = {
  conversationId: string;
  mode: "practice" | "exam";
  examResult: ExamResult | null;
  minExamAnswers: number;
  characterName: string;
  initialMessages: Msg[];
  pro: boolean;
  voiceAvailable: boolean;
  remaining: number;
  limit: number;
};

const ERRORS: Record<string, string> = {
  rate_limited: "Trop de messages d'un coup. Réessayez dans un moment.",
  overloaded: "Le service est très demandé. Réessayez dans un instant.",
  refused: "Le personnage n'a pas pu répondre à ce message. Essayez de le formuler autrement.",
  network: "La connexion a été interrompue. Réessayez.",
};

export default function Chat(props: Props) {
  const [messages, setMessages] = useState<Msg[]>(props.initialMessages);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; upgrade?: boolean; retry?: boolean } | null>(null);
  const [input, setInput] = useState("");
  const [remaining, setRemaining] = useState(props.remaining);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [exam, setExam] = useState<ExamResult | null>(props.examResult);
  const [evaluating, setEvaluating] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCache = useRef(new Map<string, string>());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const startedRef = useRef(false);

  const voice = props.pro && props.voiceAvailable;

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, streaming, note]);

  const speak = useCallback(async (id: string) => {
    if (!voice) return;
    audioRef.current?.pause();
    setSpeakingId(id);
    try {
      let url = audioCache.current.get(id);
      if (!url) {
        const res = await fetch("/api/voice/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: id }) });
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message ?? "La lecture a échoué.");
        url = URL.createObjectURL(await res.blob());
        audioCache.current.set(id, url);
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setSpeakingId(null);
      await audio.play();
    } catch (e) {
      setSpeakingId(null);
      setNote({ text: e instanceof Error ? e.message : "La lecture a échoué." });
    }
  }, [voice]);

  const ask = useCallback(async (text?: string) => {
    if (busy) return;
    setBusy(true); setNote(null);
    const tempId = `tmp-${Date.now()}`;
    if (text) setMessages((m) => [...m, { id: tempId, role: "user", text }]);
    setStreaming("");
    const ctl = new AbortController();
    abortRef.current = ctl;
    let acc = "";
    try {
      const res = await fetch(`/api/conversations/${props.conversationId}/reply`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(text ? { text } : {}), signal: ctl.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        const code = data?.error?.code as string | undefined;
        if (text) setMessages((m) => m.filter((x) => x.id !== tempId));
        if (text) setInput(text);
        setNote({ text: data?.error?.message ?? "Erreur inattendue.", upgrade: code === "daily_limit" });
        if (code === "daily_limit" || code === "daily_limit_pro") setRemaining(0);
        return;
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.t === "delta") { acc += ev.text; setStreaming(acc); }
          else if (ev.t === "done") {
            setMessages((m) => [
              ...m.map((x) => (x.id === tempId && ev.userMessageId ? { ...x, id: ev.userMessageId } : x)),
              { id: ev.id, role: "assistant", text: ev.text },
            ]);
            setRemaining(ev.remaining);
            const r = ev.reward as Reward | null;
            if (r && r.xp > 0) {
              setToast(
                r.examJustUnlocked ? `+${r.xp} XP · Les 3 paliers ${r.level} sont faits : l'épreuve de passage est débloquée !`
                : r.palierUp ? `+${r.xp} XP · Palier ${r.palier} atteint en ${r.level} !`
                : `+${r.xp} XP${r.streakDays > 1 ? ` · série de ${r.streakDays} jours 🔥` : ""}`,
              );
            }
            if (autoSpeak) void speak(ev.id);
          } else if (ev.t === "error") {
            if (ev.userMessageId) setMessages((m) => m.map((x) => (x.id === tempId ? { ...x, id: ev.userMessageId } : x)));
            setNote({ text: ERRORS[ev.code] ?? "La réponse n'a pas pu être générée.", retry: true });
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setNote({ text: ERRORS.network, retry: true });
    } finally {
      setStreaming(null); setBusy(false); abortRef.current = null;
    }
  }, [busy, props.conversationId, autoSpeak, speak]);

  // Le personnage ouvre la scène à la première visite.
  useEffect(() => {
    if (!startedRef.current && props.initialMessages.length === 0) {
      startedRef.current = true;
      void ask();
    }
  }, [ask, props.initialMessages.length]);

  function send(text = input) {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    void ask(t);
  }

  async function toggleRecord() {
    if (recording) { recorderRef.current?.stop(); return; }
    setNote(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setNote({ text: "Micro inaccessible. Autorisez le micro dans votre navigateur." });
      return;
    }
    const rec = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      if (!blob.size) return;
      setTranscribing(true);
      try {
        const fd = new FormData();
        fd.append("audio", blob);
        fd.append("conversationId", props.conversationId);
        const res = await fetch("/api/voice/transcribe", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message ?? "La transcription a échoué.");
        setInput((v) => (v ? v + " " : "") + data.text);
      } catch (e) {
        setNote({ text: e instanceof Error ? e.message : "La transcription a échoué." });
      } finally {
        setTranscribing(false);
      }
    };
    recorderRef.current = rec;
    rec.start();
    setRecording(true);
    setTimeout(() => rec.state === "recording" && rec.stop(), 60_000); // 1 minute maximum
  }

  async function finishExam() {
    setEvaluating(true); setNote(null);
    try {
      const res = await fetch(`/api/conversations/${props.conversationId}/evaluate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "L'évaluation a échoué.");
      setExam(data.result);
    } catch (e) {
      setNote({ text: e instanceof Error ? e.message : "L'évaluation a échoué." });
    } finally {
      setEvaluating(false);
    }
  }

  const answers = messages.filter((m) => m.role === "user").length;
  const lastIsUser = messages.length > 0 && messages[messages.length - 1].role === "user";

  return (
    <div className="chat">
      <div className="row">
        <span className="label">Conversation</span>
        <span className="muted small" data-testid="remaining">{remaining} réponse{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""} aujourd'hui</span>
      </div>
      <div className="log" ref={logRef} aria-live="polite">
        {messages.length === 0 && streaming === null && <p className="empty">Le personnage ouvre la scène…</p>}
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.role === "assistant" ? "ai" : "me"}`}>
            {m.role === "assistant" && (
              <span className="name">
                {props.characterName}
                {voice && !m.id.startsWith("tmp-") && (
                  <button type="button" className="speak" onClick={() => speak(m.id)} aria-label="Écouter cette réplique">
                    {speakingId === m.id ? "…" : "▶ écouter"}
                  </button>
                )}
              </span>
            )}
            <span>{m.text}</span>
          </div>
        ))}
        {streaming !== null && (
          <div className="msg ai"><span className="name">{props.characterName}</span><span>{streaming || "…"}</span></div>
        )}
        {note && (
          <p className="msg note" role="alert">
            {note.text}{" "}
            {note.upgrade && <Link href="/abonnement">Voir l'abonnement</Link>}
            {note.retry && lastIsUser && !busy && <button type="button" className="ghost" style={{ marginLeft: 6 }} onClick={() => ask()}>Réessayer</button>}
          </p>
        )}
      </div>

      {toast && <p className="small" role="status" data-testid="toast" style={{ margin: 0, color: "var(--ok)", fontWeight: 600 }}>{toast}</p>}

      {props.mode === "exam" && exam && (
        <section className="banner stack" data-testid="exam-result">
          <strong>{exam.passed ? "🎉 Épreuve réussie !" : "Pas encore cette fois"} · {exam.score}/100</strong>
          <span>{exam.summary}</span>
          {exam.strengths.length > 0 && <div><b>Points forts</b><ul style={{ margin: "4px 0" }}>{exam.strengths.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          {exam.improvements.length > 0 && <div><b>À travailler</b><ul style={{ margin: "4px 0" }}>{exam.improvements.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          <Link href="/progression">Voir ma progression →</Link>
        </section>
      )}
      {props.mode === "exam" && !exam && (
        <div className="row">
          <span className="muted small">{answers < props.minExamAnswers ? `Répondez encore ${props.minExamAnswers - answers} fois pour pouvoir terminer.` : "Vous pouvez terminer quand vous voulez."}</span>
          <button type="button" className="ghost" onClick={finishExam} disabled={busy || evaluating || answers < props.minExamAnswers}>
            {evaluating ? "Évaluation…" : "Terminer l'épreuve"}
          </button>
        </div>
      )}

      <div className="compose" hidden={Boolean(exam)}>
        <label htmlFor="msg" hidden>Votre message</label>
        <textarea id="msg" rows={1} value={input} maxLength={1000}
          placeholder={transcribing ? "Transcription…" : "Votre réponse…"}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        {voice && (
          <button type="button" className="mic" aria-pressed={recording} onClick={toggleRecord} disabled={transcribing}
            aria-label={recording ? "Arrêter l'enregistrement" : "Dicter votre réponse"}>
            {recording ? "■ Stop" : "🎤"}
          </button>
        )}
        <button className="btn" type="button" onClick={() => send()} disabled={busy || !input.trim()}>Envoyer</button>
      </div>
      <div className="quick" hidden={Boolean(exam)}>
        <button type="button" onClick={() => send("help")} disabled={busy}>help · aide</button>
        <button type="button" onClick={() => send("stop")} disabled={busy}>stop · bilan</button>
        {busy && <button type="button" onClick={() => abortRef.current?.abort()}>Arrêter</button>}
        {voice ? (
          <label><input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} /> lecture automatique</label>
        ) : (
          <Link href="/abonnement" className="small">🔒 Voix et dictée avec l'abonnement</Link>
        )}
      </div>
    </div>
  );
}
