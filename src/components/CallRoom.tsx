"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Avatar } from "@/lib/avatar";
import { splitExpression, type Expression } from "@/lib/characters";
import { useI18n } from "@/i18n/client";
import AvatarFace from "./AvatarFace";
import CountryBackdrop from "./CountryBackdrop";
import type { Theme } from "@/lib/themes";
import { useWrittenMode } from "@/lib/useWrittenMode";

type Msg = { id: string; role: "user" | "assistant"; text: string };
type Props = {
  conversationId: string; progressKey: string; name: string; age: number; avatar: Avatar; languageLabel: string;
  initialMessages: Msg[]; remaining: number; theme: Theme;
};

export default function CallRoom(p: Props) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<"ready" | "active" | "ended">("ready");
  const [messages, setMessages] = useState<Msg[]>(p.initialMessages);
  const [subtitle, setSubtitle] = useState(p.initialMessages.filter((m) => m.role === "assistant").at(-1)?.text ?? "");
  const [mine, setMine] = useState("");
  const [expression, setExpression] = useState<Expression>("sourire");
  const [mouth, setMouth] = useState(0);
  const [status, setStatus] = useState<"idle" | "thinking" | "speaking" | "listening" | "transcribing">("idle");
  const [subs, setSubs] = useState(true);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [camOn, setCamOn] = useState(false);
  const [written, setWritten] = useWrittenMode();
  const writtenRef = useRef(written);
  writtenRef.current = written;
  useEffect(() => { if (written) { setTyping(true); setSubs(true); audioRef.current?.pause(); } }, [written]);

  const ctxRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const camRef = useRef<HTMLVideoElement>(null);
  const camStream = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);

  const errText = (code?: string, fb = t.chat.unexpected) => (code && t.errors[code as keyof typeof t.errors]) || fb;

  useEffect(() => {
    if (phase !== "active") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); audioRef.current?.pause(); camStream.current?.getTracks().forEach((x) => x.stop()); }, []);

  // Bouche simulée (sans audio) : quelques battements selon la longueur du texte.
  const fakeTalk = useCallback((text: string) => new Promise<void>((resolve) => {
    const end = performance.now() + Math.min(9000, 400 + text.length * 55);
    const tick = (now: number) => {
      if (now >= end) { setMouth(0); resolve(); return; }
      setMouth(0.25 + 0.6 * Math.abs(Math.sin(now / 90)));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }), []);

  // Lit la réplique et anime la bouche selon le volume réel de la voix.
  const speak = useCallback(async (id: string, text: string) => {
    setStatus("speaking");
    // Mode écrit : pas de son, le visage s'anime pendant que la réplique s'affiche.
    if (writtenRef.current) { await fakeTalk(text); setStatus("idle"); return; }
    try {
      const res = await fetch("/api/voice/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: id }) });
      const blob = res.ok ? await res.blob() : null;
      if (!blob || blob.size === 0) { await fakeTalk(text); return; }
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      const ctx = ctxRef.current;
      if (ctx) {
        const src = ctx.createMediaElementSource(audio);
        const an = ctx.createAnalyser(); an.fftSize = 512;
        src.connect(an); an.connect(ctx.destination);
        const buf = new Uint8Array(an.fftSize);
        const tick = () => {
          an.getByteTimeDomainData(buf);
          let sum = 0; for (const v of buf) sum += (v - 128) ** 2;
          setMouth(Math.min(1, Math.sqrt(sum / buf.length) / 28));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      }
      await new Promise<void>((resolve) => { audio.onended = () => resolve(); audio.onerror = () => resolve(); audio.play().catch(() => resolve()); });
    } catch {
      await fakeTalk(text);
    } finally {
      cancelAnimationFrame(rafRef.current); setMouth(0); setStatus("idle");
    }
  }, [fakeTalk]);

  const ask = useCallback(async (text?: string) => {
    if (busyRef.current) return;
    busyRef.current = true; setError(""); setStatus("thinking"); setExpression("pensif");
    if (text) { setMine(text); setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", text }]); }
    let acc = "";
    try {
      const res = await fetch(`/api/conversations/${p.conversationId}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(text ? { text } : {}) });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setError(errText(data?.error?.code)); setStatus("idle"); setExpression("inquiet"); return;
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "", done: { id: string; text: string; expression: Expression | null } | null = null;
      for (;;) {
        const { value, done: end } = await reader.read();
        if (end) break;
        buf += value;
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.t === "delta") {
            acc += ev.text;
            const s = splitExpression(acc);
            if (s.expression) setExpression(s.expression);
            if (!/^\s*\[[^\]]*$/.test(acc)) setSubtitle(s.text);
          } else if (ev.t === "done") done = ev;
          else if (ev.t === "error") setError(errText(ev.code, t.errors.reply_failed));
        }
      }
      if (done) {
        setMessages((m) => [...m, { id: done!.id, role: "assistant", text: done!.text }]);
        setSubtitle(done.text);
        setExpression(done.expression ?? "neutre");
        await speak(done.id, done.text);
      } else setStatus("idle");
    } catch {
      setError(t.errors.network); setStatus("idle");
    } finally {
      busyRef.current = false;
    }
  }, [p.conversationId, speak, t]); // eslint-disable-line react-hooks/exhaustive-deps

  function begin() {
    try { ctxRef.current = new AudioContext(); } catch {}
    setPhase("active");
    if (messages.length === 0) void ask();
  }

  async function toggleMic() {
    if (status === "listening") { recRef.current?.stop(); return; }
    if (busyRef.current || status === "speaking") return;
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { setError(t.chat.micDenied); return; }
    const rec = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((x) => x.stop());
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      if (!blob.size) { setStatus("idle"); return; }
      setStatus("transcribing");
      const fd = new FormData(); fd.append("audio", blob); fd.append("conversationId", p.conversationId);
      const res = await fetch("/api/voice/transcribe", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.text) { setError(errText(data?.error?.code, t.chat.transcribeFailed)); setStatus("idle"); return; }
      void ask(data.text);
    };
    recRef.current = rec; rec.start(); setStatus("listening"); setExpression("neutre");
    setTimeout(() => rec.state === "recording" && rec.stop(), 45_000);
  }

  async function toggleCam() {
    if (camOn) { camStream.current?.getTracks().forEach((x) => x.stop()); camStream.current = null; setCamOn(false); return; }
    try {
      camStream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setCamOn(true);
      setTimeout(() => { if (camRef.current && camStream.current) camRef.current.srcObject = camStream.current; }, 0);
    } catch { setError(t.chat.micDenied); }
  }

  function hangUp() {
    audioRef.current?.pause(); cancelAnimationFrame(rafRef.current); recRef.current?.state === "recording" && recRef.current.stop();
    camStream.current?.getTracks().forEach((x) => x.stop()); setCamOn(false);
    setPhase("ended"); setStatus("idle"); setMouth(0);
  }

  const mm = Math.floor(seconds / 60), ss = seconds % 60;
  const statusText = status === "thinking" ? `${p.name} ${t.call.thinking}` : status === "speaking" ? `${p.name} ${t.call.speaking}` : status === "listening" ? t.call.listening : status === "transcribing" ? t.chat.transcribing : "";

  return (
    <div className="callroom" data-testid="callroom" data-expression={expression} data-status={status}>
      <CountryBackdrop className="call-bg" theme={p.theme} scenery={p.avatar.scenery} time={p.avatar.time} />
      <div className="call-top">
        <span><b>{p.name}</b> · {p.languageLabel}</span>
        <span className="call-timer">{phase === "active" ? t.call.duration(mm, ss) : ""}</span>
      </div>
      <AvatarFace className={`call-face ${status === "speaking" ? "talking" : ""}`} avatar={p.avatar} expression={expression} mouth={mouth} age={p.age} />
      {camOn && <video ref={camRef} className="call-cam" autoPlay muted playsInline />}

      {phase === "ready" && (
        <div className="call-overlay">
          <button type="button" className="call-btn accept" onClick={begin} aria-label={t.call.startCall}>📞</button>
          <span>{t.call.startCall}</span>
        </div>
      )}
      {phase === "ended" && (
        <div className="call-overlay">
          <strong>{t.call.ended} · {t.call.duration(mm, ss)}</strong>
          <span className="row" style={{ justifyContent: "center" }}>
            <Link className="btn" href={`/appel/nouveau?key=${encodeURIComponent(p.progressKey)}`}>{t.call.newCall}</Link>
            <Link className="ghost" href="/parcours">{t.call.back}</Link>
          </span>
        </div>
      )}

      {phase === "active" && (
        <>
          <div className="call-subs" aria-live="polite">
            {statusText && <span className="call-status" data-testid="call-status">{statusText}</span>}
            {subs && subtitle && <p data-testid="subtitle">{subtitle}</p>}
            {subs && mine && <p className="mine">{mine}</p>}
            {error && <p className="call-error" role="alert">{error}</p>}
          </div>
          {typing && (
            <form className="call-type" onSubmit={(e) => { e.preventDefault(); const v = input.trim(); if (v) { setInput(""); void ask(v); } }}>
              <input type="text" value={input} maxLength={1000} onChange={(e) => setInput(e.target.value)} placeholder={t.chat.placeholder} aria-label={t.chat.placeholder} />
              <button className="btn" type="submit" disabled={status !== "idle"}>{t.chat.send}</button>
            </form>
          )}
          <div className="call-controls">
            <button type="button" className="call-btn small" aria-pressed={subs} onClick={() => setSubs((v) => !v)} aria-label={t.call.subtitles} title={t.call.subtitles}>CC</button>
            <button type="button" className="call-btn small" aria-pressed={camOn} onClick={toggleCam} aria-label={t.call.myCamera} title={t.call.myCamera}>📷</button>
            {!written && (
              <button type="button" className={`call-btn mic ${status === "listening" ? "on" : ""}`} onClick={toggleMic}
                disabled={status === "thinking" || status === "speaking" || status === "transcribing"} aria-label={status === "listening" ? t.call.listening : t.call.talk}>🎤</button>
            )}
            <button type="button" className="call-btn small" aria-pressed={typing} onClick={() => setTyping((v) => !v)} aria-label={t.call.typeInstead} title={t.call.typeInstead}>⌨️</button>
            <button type="button" className="call-btn small" aria-pressed={written} onClick={() => setWritten(!written)} aria-label={t.written.label} title={t.written.help}>✍️</button>
            <button type="button" className="call-btn end" onClick={hangUp} aria-label={t.call.endCall} title={t.call.endCall}>📵</button>
          </div>
        </>
      )}
    </div>
  );
}
