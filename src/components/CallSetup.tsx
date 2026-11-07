"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BEARDS, EYE_COLORS, HAIR_COLORS, HAIR_STYLES, OUTFITS, SCENERIES, SKIN_TONES, TIMES, VOICES, type Avatar,
} from "@/lib/avatar";
import { MAX_FIELD_LENGTH } from "@/lib/characters";
import { useI18n } from "@/i18n/client";
import AvatarFace from "./AvatarFace";
import Scenery from "./Scenery";

type Props = { progressKey: string; languageLabel: string; defaults: { avatar: Avatar; name: string; place: string } };

export default function CallSetup({ progressKey, languageLabel, defaults }: Props) {
  const { t } = useI18n();
  const o = t.call.options;
  const router = useRouter();
  const [avatar, setAvatar] = useState<Avatar>(defaults.avatar);
  const [name, setName] = useState(defaults.name);
  const [age, setAge] = useState(32);
  const [place, setPlace] = useState(defaults.place);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  const set = <K extends keyof Avatar>(k: K, v: Avatar[K]) => setAvatar((a) => ({ ...a, [k]: v }));

  async function preview() {
    setPreviewing(true);
    try {
      const res = await fetch("/api/voice/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preview: { voice: avatar.voice, language: languageLabel } }) });
      if (res.ok) { audio.current?.pause(); audio.current = new Audio(URL.createObjectURL(await res.blob())); await audio.current.play(); }
    } finally { setPreviewing(false); }
  }

  async function start() {
    setBusy(true); setError("");
    const res = await fetch("/api/calls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: progressKey, name, age, place, topic, avatar }) });
    const data = await res.json().catch(() => null);
    if (res.ok) { router.push(`/appel/${data.id}`); return; }
    setError(t.errors[data?.error?.code as keyof typeof t.errors] ?? t.chat.unexpected);
    setBusy(false);
  }

  const Swatches = ({ colors, value, onPick, label }: { colors: string[]; value: number; onPick: (i: number) => void; label: string }) => (
    <div role="radiogroup" aria-label={label} className="swatches">
      {colors.map((c, i) => (
        <button key={c} type="button" role="radio" aria-checked={value === i} aria-label={`${label} ${i + 1}`} style={{ background: c }} onClick={() => onPick(i)} />
      ))}
    </div>
  );

  return (
    <div className="setup">
      <div className="setup-preview">
        <Scenery className="setup-bg" scenery={avatar.scenery} time={avatar.time} />
        <AvatarFace className="setup-face" avatar={avatar} expression="sourire" age={age} />
        <span className="setup-name">{name || "…"} · {languageLabel}</span>
      </div>

      <div className="card stack">
        <div className="controls">
          <label><span className="label">{t.call.name}</span><input type="text" maxLength={MAX_FIELD_LENGTH} value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label><span className="label">{t.call.age}</span>
            <select value={age} onChange={(e) => setAge(Number(e.target.value))}>{Array.from({ length: 84 }, (_, i) => i + 16).map((a) => <option key={a} value={a}>{t.home.years(a)}</option>)}</select></label>
          <label><span className="label">{t.call.place}</span><input type="text" maxLength={MAX_FIELD_LENGTH} value={place} onChange={(e) => setPlace(e.target.value)} /></label>
        </div>
        <label className="stack" style={{ gap: 4 }}><span className="label">{t.call.topic}</span>
          <input type="text" maxLength={200} value={topic} placeholder={t.call.topicPlaceholder} onChange={(e) => setTopic(e.target.value)} /></label>

        <h2 style={{ margin: 0, fontSize: 20 }}>{t.call.face}</h2>
        <div className="stack" style={{ gap: 4 }}><span className="label">{t.call.skin}</span>
          <Swatches colors={SKIN_TONES} value={avatar.skin} onPick={(i) => set("skin", i)} label={t.call.skin} /></div>
        <div className="controls">
          <label><span className="label">{t.call.hairStyle}</span>
            <select value={avatar.hairStyle} onChange={(e) => set("hairStyle", e.target.value as Avatar["hairStyle"])}>{HAIR_STYLES.map((h) => <option key={h} value={h}>{o.hairStyle[h]}</option>)}</select></label>
          <label><span className="label">{t.call.hairColor}</span>
            <select value={avatar.hairColor} onChange={(e) => set("hairColor", e.target.value as Avatar["hairColor"])}>{(Object.keys(HAIR_COLORS) as Avatar["hairColor"][]).map((h) => <option key={h} value={h}>{o.hairColor[h]}</option>)}</select></label>
          <label><span className="label">{t.call.eyes}</span>
            <select value={avatar.eyes} onChange={(e) => set("eyes", e.target.value as Avatar["eyes"])}>{(Object.keys(EYE_COLORS) as Avatar["eyes"][]).map((h) => <option key={h} value={h}>{o.eyes[h]}</option>)}</select></label>
          <label><span className="label">{t.call.beard}</span>
            <select value={avatar.beard} onChange={(e) => set("beard", e.target.value as Avatar["beard"])}>{BEARDS.map((h) => <option key={h} value={h}>{o.beard[h]}</option>)}</select></label>
          <label><span className="label">{t.call.glasses}</span>
            <select value={String(avatar.glasses)} onChange={(e) => set("glasses", e.target.value === "true")}><option value="false">{o.no}</option><option value="true">{o.yes}</option></select></label>
          <label><span className="label">{t.call.earrings}</span>
            <select value={String(avatar.earrings)} onChange={(e) => set("earrings", e.target.value === "true")}><option value="false">{o.no}</option><option value="true">{o.yes}</option></select></label>
        </div>
        <div className="stack" style={{ gap: 4 }}><span className="label">{t.call.outfit}</span>
          <Swatches colors={OUTFITS} value={avatar.outfit} onPick={(i) => set("outfit", i)} label={t.call.outfit} /></div>
        <div className="controls">
          <label><span className="label">{t.call.scenery}</span>
            <select value={avatar.scenery} onChange={(e) => set("scenery", e.target.value as Avatar["scenery"])}>{SCENERIES.map((h) => <option key={h} value={h}>{o.scenery[h]}</option>)}</select></label>
          <label><span className="label">{t.call.timeOfDay}</span>
            <select value={avatar.time} onChange={(e) => set("time", e.target.value as Avatar["time"])}>{TIMES.map((h) => <option key={h} value={h}>{o.time[h]}</option>)}</select></label>
          <label><span className="label">{t.call.voice}</span>
            <span className="row" style={{ flexWrap: "nowrap" }}>
              <select style={{ flex: 1 }} value={avatar.voice} onChange={(e) => set("voice", e.target.value as Avatar["voice"])}>{VOICES.map((h) => <option key={h} value={h}>{o.voice[h]}</option>)}</select>
              <button type="button" className="ghost" onClick={preview} disabled={previewing}>{t.call.tryVoice}</button>
            </span></label>
        </div>
        <p className="muted small" style={{ margin: 0 }}>{t.call.illustrated}</p>
        <button className="btn" type="button" onClick={start} disabled={busy}>📹 {busy ? t.call.starting : t.call.startCall}</button>
        {error && <p className="msg note" role="alert">{error}</p>}
      </div>
    </div>
  );
}
