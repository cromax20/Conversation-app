"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/client";
import Assist from "./Assist";
import WrittenToggle from "./WrittenToggle";
import { useWrittenMode } from "@/lib/useWrittenMode";

type Msg = { id: string; role: "user" | "assistant"; text: string };

type ExamResult = { passed: boolean; score: number; summary: string; strengths: string[]; improvements: string[] };
type Reward = { xp: number; level: string; palier: number; palierUp: boolean; examReady: boolean; examJustUnlocked: boolean; streakDays: number };

type Props = {
  conversationId: string;
  mode: "practice" | "exam";
  examResult: ExamResult | null;
  minExamAnswers: number;
  level: string;
  nativeName: string;
  characterName: string;
  initialMessages: Msg[];
  pro: boolean;
  voiceAvailable: boolean;
  remaining: number;
  limit: number;
};


export default function Chat(props: Props) {
  const { t } = useI18n();
  const errText = (code?: string, fallback = t.chat.unexpected) => (code && t.errors[code as keyof typeof t.errors]) || fallback;
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
  const [lineTr, setLineTr] = useState<Record<string, string>>({});

  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCache = useRef(new Map<string, string>());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const startedRef = useRef(false);

  const [written] = useWrittenMode();
  const voiceAllowed = props.pro && props.voiceAvailable;
  const voice = voiceAllowed && !written;

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
        if (!res.ok) throw new Error(errText((await res.json().catch(() => null))?.error?.code, t.chat.speakFailed));
        url = URL.createObjectURL(await res.blob());
        audioCache.current.set(id, url);
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setSpeakingId(null);
      await audio.play();
    } catch (e) {
      setSpeakingId(null);
      setNote({ text: e instanceof Error ? e.message : t.chat.speakFailed });
    }
  }, [voice, t]);

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
        setNote({ text: errText(code), upgrade: code === "daily_limit" });
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
                r.examJustUnlocked ? t.chat.examUnlocked(r.xp, r.level)
                : r.palierUp ? t.chat.palierUp(r.xp, r.palier, r.level)
                : r.streakDays > 1 ? t.chat.xpStreak(r.xp, r.streakDays) : t.chat.xp(r.xp),
              );
            }
            if (autoSpeak && voice) void speak(ev.id);
          } else if (ev.t === "error") {
            if (ev.userMessageId) setMessages((m) => m.map((x) => (x.id === tempId ? { ...x, id: ev.userMessageId } : x)));
            setNote({ text: errText(ev.code, t.errors.reply_failed), retry: true });
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setNote({ text: t.errors.network, retry: true });
    } finally {
      setStreaming(null); setBusy(false); abortRef.current = null;
    }
  }, [busy, props.conversationId, autoSpeak, voice, speak, t]);

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
      setNote({ text: t.chat.micDenied });
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
        if (!res.ok) throw new Error(errText(data?.error?.code, t.chat.transcribeFailed));
        setInput((v) => (v ? v + " " : "") + data.text);
      } catch (e) {
        setNote({ text: e instanceof Error ? e.message : t.chat.transcribeFailed });
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
      if (!res.ok) throw new Error(errText(data?.error?.code, t.exam.failedEval));
      setExam(data.result);
    } catch (e) {
      setNote({ text: e instanceof Error ? e.message : t.exam.failedEval });
    } finally {
      setEvaluating(false);
    }
  }

  async function translateLine(m: Msg) {
    if (lineTr[m.id]) { setLineTr(({ [m.id]: _, ...rest }) => rest); return; }
    setLineTr((x) => ({ ...x, [m.id]: "…" }));
    const res = await fetch(`/api/conversations/${props.conversationId}/translate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: m.text, direction: "toNative" }) });
    const data = await res.json().catch(() => null);
    if (res.ok) { setLineTr((x) => ({ ...x, [m.id]: data.translation + (data.note ? ` — ${data.note}` : "") })); setRemaining(data.remaining); }
    else { setLineTr(({ [m.id]: _, ...rest }) => rest); setNote({ text: errText(data?.error?.code, t.errors.reply_failed), upgrade: data?.error?.code === "daily_limit" }); }
  }

  const answers = messages.filter((m) => m.role === "user").length;
  const lastIsUser = messages.length > 0 && messages[messages.length - 1].role === "user";

  return (
    <div className="chat">
      <div className="row">
        <span className="label">{t.chat.conversation}</span>
        <span className="muted small" data-testid="remaining">{t.chat.remaining(remaining)}</span>
      </div>
      <div className="log" ref={logRef} aria-live="polite">
        {messages.length === 0 && streaming === null && <p className="empty">{t.chat.opening}</p>}
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.role === "assistant" ? "ai" : "me"}`}>
            {m.role === "assistant" && (
              <span className="name">
                {props.characterName}
                {voice && !m.id.startsWith("tmp-") && (
                  <button type="button" className="speak" onClick={() => speak(m.id)} aria-label={t.chat.listenLabel}>
                    {speakingId === m.id ? "…" : t.chat.listen}
                  </button>
                )}
              </span>
            )}
            <span>{m.text}</span>
            {m.role === "assistant" && props.mode === "practice" && !m.id.startsWith("tmp-") && (
              <>
                {lineTr[m.id] && <span className="line-tr" data-testid="line-translation">{lineTr[m.id]}</span>}
                <button type="button" className="speak tr" onClick={() => translateLine(m)}>{lineTr[m.id] ? t.assist.hide : t.assist.translateLine}</button>
              </>
            )}
          </div>
        ))}
        {streaming !== null && (
          <div className="msg ai"><span className="name">{props.characterName}</span><span>{streaming || "…"}</span></div>
        )}
        {note && (
          <p className="msg note" role="alert">
            {note.text}{" "}
            {note.upgrade && <Link href="/abonnement">{t.chat.seePlan}</Link>}
            {note.retry && lastIsUser && !busy && <button type="button" className="ghost" style={{ marginLeft: 6 }} onClick={() => ask()}>{t.chat.retry}</button>}
          </p>
        )}
      </div>

      {toast && <p className="small" role="status" data-testid="toast" style={{ margin: 0, color: "var(--ok)", fontWeight: 600 }}>{toast}</p>}

      {props.mode === "exam" && exam && (
        <section className="banner stack" data-testid="exam-result">
          <strong>{exam.passed ? t.exam.passed : t.exam.failed} · {exam.score}/100</strong>
          <span>{exam.summary}</span>
          {exam.strengths.length > 0 && <div><b>{t.exam.strengths}</b><ul style={{ margin: "4px 0" }}>{exam.strengths.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          {exam.improvements.length > 0 && <div><b>{t.exam.improvements}</b><ul style={{ margin: "4px 0" }}>{exam.improvements.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          <Link href="/parcours">{t.exam.seePath}</Link>
        </section>
      )}
      {props.mode === "exam" && !exam && (
        <div className="row">
          <span className="muted small">{answers < props.minExamAnswers ? t.exam.moreAnswers(props.minExamAnswers - answers) : t.exam.canFinish}</span>
          <button type="button" className="ghost" onClick={finishExam} disabled={busy || evaluating || answers < props.minExamAnswers}>
            {evaluating ? t.exam.evaluating : t.exam.finish}
          </button>
        </div>
      )}

      {props.mode === "practice" && (
        <Assist conversationId={props.conversationId} beginner={props.level === "A1" || props.level === "A2"} nativeName={props.nativeName}
          onUse={(text) => { setInput((v) => (v.trim() ? v.trimEnd() + " " : "") + text); document.getElementById("msg")?.focus(); }}
          onRemaining={setRemaining} />
      )}

      <div className="compose" hidden={Boolean(exam)}>
        <label htmlFor="msg" hidden>{t.chat.placeholder}</label>
        <textarea id="msg" rows={1} value={input} maxLength={1000}
          placeholder={transcribing ? t.chat.transcribing : t.chat.placeholder}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        {voice && (
          <button type="button" className="mic" aria-pressed={recording} onClick={toggleRecord} disabled={transcribing}
            aria-label={recording ? t.chat.stopRecording : t.chat.dictate}>
            {recording ? t.chat.stop : "🎤"}
          </button>
        )}
        <button className="btn" type="button" onClick={() => send()} disabled={busy || !input.trim()}>{t.chat.send}</button>
      </div>
      <div className="quick" hidden={Boolean(exam)}>
        <button type="button" onClick={() => send("help")} disabled={busy}>{t.chat.help}</button>
        <button type="button" onClick={() => send("stop")} disabled={busy}>{t.chat.review}</button>
        {busy && <button type="button" onClick={() => abortRef.current?.abort()}>{t.chat.abort}</button>}
        {voice && <label><input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} /> {t.chat.autoplay}</label>}
        {voiceAllowed && <WrittenToggle />}
        {!voiceAllowed && <Link href="/abonnement" className="small">{t.chat.voiceLocked}</Link>}
      </div>
    </div>
  );
}
