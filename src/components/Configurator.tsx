"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CUSTOM, HOBBIES, JOBS, LANGUAGES, LEVEL_ORDER, MAX_CONTEXT_LENGTH, MAX_FIELD_LENGTH, NATIVE_CODES, REGIONS, SCENES, TRAITS,
  languageByCode, randomCharacter, randomSceneIndex, type Character, type ConversationSetup, type Expression, type Level,
} from "@/lib/characters";
import { avatarFromSeed } from "@/lib/avatar";
import { greetingFor, themeFor } from "@/lib/themes";
import { languageLabel, nativeLabel } from "@/i18n";
import { useI18n } from "@/i18n/client";
import WrittenToggle from "./WrittenToggle";
import AvatarFace from "./AvatarFace";
import CountryBackdrop from "./CountryBackdrop";

const PENDING_KEY = "atelier:pending-setup";
const LANG_KEY = "atelier:lang";
const POPULAR = ["es", "en", "ja", "ar", "ary", "kab", "it", "pt-BR", "de", "ko", "wo", "ht", "zh", "sw"];
const FLOATING = ["es", "ja", "kab", "ar", "ko", "wo", "it", "pt-BR", "hi", "ht", "ru", "sw", "el", "zh", "tr", "haw", "ln", "de"];
const SCENE_ICONS = ["🍎", "☕", "🩺", "🧭", "🏨", "🏠", "💼", "🍽️", "🚕", "🚉", "🎉", "📞", "👗", "🏛️", "💬", "🏦", "🔑", "👋", "💊", "❤️"];

function storageGet(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function storageSet(key: string, v: string | null) {
  try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, v); } catch {}
}

type SceneChoice = "free" | "r" | number;
type Pending = ConversationSetup & { sceneChoice: SceneChoice };

export default function Configurator({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const byRegion = useMemo(() => REGIONS.map((r) => ({
    region: r,
    langs: LANGUAGES.map((l) => ({ l, label: languageLabel(l, locale) })).filter((x) => x.l.region === r).sort((a, b) => a.label.localeCompare(b.label, locale)),
  })), [locale]);
  const natives = useMemo(() => NATIVE_CODES.map((c) => ({ c, label: nativeLabel(c, locale) })), [locale]);
  const [language, setLanguage] = useState("en");
  const [customLanguage, setCustomLanguage] = useState("");
  const [level, setLevel] = useState<Level>("A2");
  const [nativeLang, setNativeLang] = useState<string>(NATIVE_CODES.includes(locale) ? locale : "fr");
  const [context, setContext] = useState("");
  const [sceneChoice, setSceneChoice] = useState<SceneChoice>("free");
  const [randomScene, setRandomScene] = useState(0);
  const [character, setCharacter] = useState<Character | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mood, setMood] = useState<Expression>("sourire");
  const builderRef = useRef<HTMLElement>(null);

  // Tirage initial côté navigateur (évite un écart entre rendu serveur et client).
  useEffect(() => {
    const pending = storageGet(PENDING_KEY);
    if (pending) {
      try {
        const s = JSON.parse(pending) as Pending;
        setLanguage(s.language); setCustomLanguage(s.customLanguage ?? ""); setLevel(s.level);
        if (NATIVE_CODES.includes(s.nativeLang)) setNativeLang(s.nativeLang);
        setContext(s.context); setSceneChoice(s.sceneChoice); setRandomScene(s.sceneIndex ?? 0); setCharacter(s.character);
        storageSet(PENDING_KEY, null);
        return;
      } catch {}
    }
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    const saved = fromUrl && languageByCode(fromUrl) ? fromUrl : storageGet(LANG_KEY);
    const code = saved === CUSTOM || languageByCode(saved ?? "") ? saved! : "en";
    setLanguage(code);
    setCharacter(randomCharacter(languageByCode(code) ?? null));
    setRandomScene(randomSceneIndex());
  }, []);

  const lang = language === CUSTOM ? null : languageByCode(language) ?? LANGUAGES[0];
  const langLabel = lang ? languageLabel(lang, locale) : customLanguage.trim() || t.home.customPending;
  const theme = themeFor(lang ? lang.code : "custom");
  const freeTalk = !context.trim() && sceneChoice === "free";
  const sceneIndex = context.trim() || freeTalk ? null : sceneChoice === "r" ? randomScene : (sceneChoice as number);
  const scene = context.trim() ? { title: t.yourScene, description: context.trim() }
    : freeTalk ? { title: t.home.freeTalk, description: t.home.freeTalkDesc }
    : { title: t.data.scenes[sceneIndex ?? 0][0], description: t.data.scenes[sceneIndex ?? 0][1] };
  const tr = (kind: "jobs" | "traits" | "hobbies", v: string) => {
    const i = (kind === "jobs" ? JOBS : kind === "traits" ? TRAITS : HOBBIES).indexOf(v);
    return i >= 0 ? t.data[kind][i] : v;
  };
  const avatar = useMemo(() => avatarFromSeed(`${character?.name}|${character?.city}|${character?.age}|${language}`), [character, language]);

  function surprise() {
    setMood("surpris");
    setTimeout(() => setMood("sourire"), 700);
  }

  function reroll(code = language) {
    const l = languageByCode(code) ?? null;
    setCharacter((prev) => {
      const next = randomCharacter(l);
      // Langue libre : on garde le prénom et le lieu saisis par l'élève.
      return l ? next : { ...next, name: prev?.name ?? "", city: prev?.city ?? "" };
    });
    setRandomScene(randomSceneIndex());
    surprise();
  }

  function changeLanguage(code: string) {
    setLanguage(code);
    storageSet(LANG_KEY, code);
    reroll(code);
    if (code === CUSTOM) setEditing(true);
  }

  function pickFromHero(code: string) {
    changeLanguage(code);
    builderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setField<K extends keyof Character>(k: K, v: Character[K]) {
    setCharacter((c) => (c ? { ...c, [k]: v } : c));
  }

  async function start() {
    if (!character) return;
    if (language === CUSTOM && customLanguage.trim().length < 2) {
      setError(t.home.customMissing);
      return;
    }
    const setup: ConversationSetup = {
      language, customLanguage: language === CUSTOM ? customLanguage.trim() : undefined,
      level, nativeLang, character: { ...character, name: character.name.trim(), city: character.city.trim() }, sceneIndex, context: context.trim(), freeTalk,
    };
    if (!signedIn) {
      storageSet(PENDING_KEY, JSON.stringify({ ...setup, sceneChoice }));
      router.push("/login?callbackUrl=/");
      return;
    }
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(setup) });
      const data = await res.json();
      if (!res.ok) throw new Error((data?.error?.code && t.errors[data.error.code as keyof typeof t.errors]) || t.home.createFailed);
      router.push(`/c/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.chat.unexpected);
      setBusy(false);
    }
  }

  return (
    <>
      {/* ---- Bandeau d'accueil ---- */}
      <section className="hero">
        <div className="hero-floats" aria-label={t.landing.pick}>
          {FLOATING.map((code, i) => {
            const l = languageByCode(code);
            if (!l) return null;
            return (
              <button key={code} type="button" className="float" onClick={() => pickFromHero(code)}
                style={{ ["--i" as string]: i, insetInlineStart: `${(i * 41) % 78}%`, top: `${6 + ((i * 29) % 80)}%` }}
                title={languageLabel(l, locale)}>
                {greetingFor(code) ?? l.native}
              </button>
            );
          })}
        </div>
        <div className="hero-content">
          <span className="kicker">{t.landing.kicker}</span>
          <h1>{t.landing.title}</h1>
          <p>{t.landing.lede}</p>
          <div className="hero-cta">
            <button type="button" className="btn btn-glow" onClick={() => builderRef.current?.scrollIntoView({ behavior: "smooth" })}>{t.landing.cta} →</button>
            {signedIn && <a className="btn btn-ghost-light" href="/parcours">🗺️ {t.landing.ctaPath}</a>}
          </div>
          <span className="hero-hint">👆 {t.landing.pick}</span>
        </div>
      </section>

      <section className="features">
        {t.landing.features.map(([icon, title, text], i) => (
          <article key={title} className="feature" style={{ ["--f" as string]: i }}>
            <span className="feature-icon" aria-hidden="true">{icon}</span>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>

      {/* ---- Création en 3 étapes ---- */}
      <section className="builder" id="builder" ref={builderRef} style={{ ["--c1" as string]: theme.colors[0], ["--c2" as string]: theme.colors[1], ["--c3" as string]: theme.colors[2] }}>
        <div className="step">
          <h2 className="step-title"><span className="step-num">1</span>{t.landing.step1}</h2>
          <div className="chips popular" aria-label={t.landing.quick}>
            {POPULAR.map((code) => {
              const l = languageByCode(code)!;
              return (
                <button key={code} type="button" className="chip lang-chip" aria-pressed={language === code} onClick={() => changeLanguage(code)}>
                  <b>{greetingFor(code)}</b> {languageLabel(l, locale)}
                </button>
              );
            })}
          </div>
          <div className="controls">
            <label htmlFor="lang"><span className="label">{t.home.languageLabel}</span>
              <select id="lang" value={language} onChange={(e) => changeLanguage(e.target.value)}>
                <option value={CUSTOM}>{t.home.otherLanguage}</option>
                {byRegion.map((g) => (
                  <optgroup key={g.region} label={t.regions[g.region] ?? g.region}>
                    {g.langs.map(({ l, label }) => <option key={l.code} value={l.code}>{label === l.native ? label : `${label} · ${l.native}`}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <label htmlFor="level"><span className="label">{t.home.levelLabel}</span>
              <select id="level" value={level} onChange={(e) => setLevel(e.target.value as Level)}>
                {LEVEL_ORDER.map((k) => <option key={k} value={k}>{t.levels[k]}</option>)}
              </select>
            </label>
            <label htmlFor="native"><span className="label">{t.home.nativeLabel}</span>
              <select id="native" value={nativeLang} onChange={(e) => setNativeLang(e.target.value)}>
                {natives.map((n) => <option key={n.c} value={n.c}>{n.label}</option>)}
              </select>
            </label>
          </div>
          {language === CUSTOM && (
            <label className="stack" style={{ gap: 4 }} htmlFor="customLang">
              <span className="label">{t.home.customLabel}</span>
              <input id="customLang" type="text" maxLength={MAX_FIELD_LENGTH} value={customLanguage} onChange={(e) => setCustomLanguage(e.target.value)}
                placeholder={t.home.customPlaceholder} />
              <span className="muted small">{t.home.customHelp}</span>
            </label>
          )}
        </div>

        <div className="step">
          <h2 className="step-title"><span className="step-num">2</span>{t.landing.step2}</h2>
          <div className="chips">
            <button className="chip chip-free" type="button" aria-pressed={freeTalk}
              onClick={() => { setContext(""); setSceneChoice("free"); }}>💬 {t.home.freeTalk}</button>
          </div>
          <p className="muted small" style={{ margin: 0 }}>{t.home.orScene}</p>
          <div className="chips">
            <button className="chip" type="button" aria-pressed={!context.trim() && sceneChoice === "r"}
              onClick={() => { setContext(""); setSceneChoice("r"); setRandomScene(randomSceneIndex()); }}>🎲 {t.home.random}</button>
            {SCENES.map((s, i) => (
              <button key={s[0]} className="chip" type="button" aria-pressed={!context.trim() && sceneChoice === i}
                onClick={() => { setContext(""); setSceneChoice(i); }}>{SCENE_ICONS[i]} {t.data.scenes[i][0]}</button>
            ))}
          </div>
          <label className="label" htmlFor="ctx">{t.home.contextHelp}</label>
          <textarea id="ctx" rows={2} maxLength={MAX_CONTEXT_LENGTH} value={context} onChange={(e) => setContext(e.target.value)}
            placeholder={t.home.contextPlaceholder} />
        </div>

        <div className="step">
          <h2 className="step-title"><span className="step-num">3</span>{t.landing.step3}</h2>
          <article className="card persona" aria-live="polite">
            <div className="persona-banner" onMouseEnter={() => setMood("rire")} onMouseLeave={() => setMood("sourire")}>
              <CountryBackdrop className="persona-bg" theme={theme} scenery="country" time={theme.time} interval={5000} />
              {character && <AvatarFace className="persona-face" avatar={avatar} expression={mood} age={character.age} />}
              {theme.greeting && character && (
                <span className="speech">{theme.greeting}{character.name.trim() ? ` — ${character.name.trim()}` : ""}</span>
              )}
              <div className="stamp">{level}</div>
              <div className="persona-stickers" aria-hidden="true">{[...theme.landmarks, ...theme.dishes].slice(0, 6).map((s) => <span key={s.label} title={s.label}>{s.emoji}</span>)}</div>
            </div>
            {character ? (
              <>
                <h2 className="who">
                  {character.name.trim() || t.home.nameChosenByCharacter}, {t.home.years(character.age)}{character.city.trim() ? `, ${character.city.trim()}` : ""}
                </h2>
                <ul className="facts">
                  {[tr("jobs", character.job), tr("traits", character.trait), t.home.likes(tr("hobbies", character.hobby)), langLabel].map((x) => <li key={x}>{x}</li>)}
                </ul>
                <p className="scene"><b>{scene.title}</b> · {scene.description}.</p>
                <div className="row" style={{ justifyContent: "flex-start" }}>
                  <button className="ghost" type="button" onClick={() => reroll()}>🎲 {t.home.reroll}</button>
                  <button type="button" className="ghost" aria-expanded={editing} onClick={() => setEditing((v) => !v)}>
                    ✏️ {editing ? t.home.closeCustomize : t.home.customize}
                  </button>
                </div>
                {editing && (
                  <div className="controls">
                    <label><span className="label">{t.home.firstName}</span>
                      <input type="text" maxLength={MAX_FIELD_LENGTH} value={character.name} placeholder={t.home.firstNamePlaceholder} onChange={(e) => setField("name", e.target.value)} /></label>
                    <label><span className="label">{t.home.place}</span>
                      <input type="text" maxLength={MAX_FIELD_LENGTH} value={character.city} placeholder={t.home.placePlaceholder} onChange={(e) => setField("city", e.target.value)} /></label>
                    <label><span className="label">{t.home.age}</span>
                      <select value={character.age} onChange={(e) => setField("age", Number(e.target.value))}>
                        {Array.from({ length: 84 }, (_, i) => i + 16).map((a) => <option key={a} value={a}>{t.home.years(a)}</option>)}
                      </select></label>
                  </div>
                )}
              </>
            ) : <p className="muted">{t.home.preparing}</p>}
            <WrittenToggle className="written-home" />
            <button className="btn btn-glow" type="button" onClick={start} disabled={busy || !character}>
              {busy ? t.home.starting : signedIn ? t.home.start : t.home.startSignedOut}
            </button>
            {error && <p className="msg note" role="alert">{error}</p>}
            {!signedIn && <p className="muted small" style={{ margin: 0, textAlign: "center" }}>{t.home.freeNote}</p>}
          </article>
        </div>
      </section>
    </>
  );
}
