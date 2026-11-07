"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CUSTOM, LANGUAGES, LEVEL_LABELS, MAX_CONTEXT_LENGTH, MAX_FIELD_LENGTH, NATIVE_LANGS, REGIONS, SCENES, describeScene,
  languageByCode, randomCharacter, randomSceneIndex, type Character, type ConversationSetup, type Level,
} from "@/lib/characters";

const PENDING_KEY = "atelier:pending-setup";
const LANG_KEY = "atelier:lang";

function storageGet(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function storageSet(key: string, v: string | null) {
  try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, v); } catch {}
}

const BY_REGION = REGIONS.map((r) => ({
  region: r,
  langs: LANGUAGES.filter((l) => l.region === r).sort((a, b) => a.fr.localeCompare(b.fr, "fr")),
}));

type Pending = ConversationSetup & { sceneChoice: "r" | number };

export default function Configurator({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [language, setLanguage] = useState("en");
  const [customLanguage, setCustomLanguage] = useState("");
  const [level, setLevel] = useState<Level>("A2");
  const [nativeLang, setNativeLang] = useState(NATIVE_LANGS[0]);
  const [context, setContext] = useState("");
  const [sceneChoice, setSceneChoice] = useState<"r" | number>("r");
  const [randomScene, setRandomScene] = useState(0);
  const [character, setCharacter] = useState<Character | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Tirage initial côté navigateur (évite un écart entre rendu serveur et client).
  useEffect(() => {
    const pending = storageGet(PENDING_KEY);
    if (pending) {
      try {
        const s = JSON.parse(pending) as Pending;
        setLanguage(s.language); setCustomLanguage(s.customLanguage ?? ""); setLevel(s.level); setNativeLang(s.nativeLang);
        setContext(s.context); setSceneChoice(s.sceneChoice); setRandomScene(s.sceneIndex ?? 0); setCharacter(s.character);
        storageSet(PENDING_KEY, null);
        return;
      } catch {}
    }
    const saved = storageGet(LANG_KEY);
    const code = saved === CUSTOM || languageByCode(saved ?? "") ? saved! : "en";
    setLanguage(code);
    setCharacter(randomCharacter(languageByCode(code) ?? null));
    setRandomScene(randomSceneIndex());
  }, []);

  const lang = language === CUSTOM ? null : languageByCode(language) ?? LANGUAGES[0];
  const langLabel = lang ? lang.fr : customLanguage.trim() || "Langue ou dialecte à préciser";
  const sceneIndex = context.trim() ? null : sceneChoice === "r" ? randomScene : sceneChoice;
  const scene = useMemo(() => describeScene({ sceneIndex, context }), [sceneIndex, context]);

  function reroll(code = language) {
    const l = languageByCode(code) ?? null;
    setCharacter((prev) => {
      const next = randomCharacter(l);
      // Langue libre : on garde le prénom et le lieu saisis par l'élève.
      return l ? next : { ...next, name: prev?.name ?? "", city: prev?.city ?? "" };
    });
    setRandomScene(randomSceneIndex());
  }

  function changeLanguage(code: string) {
    setLanguage(code);
    storageSet(LANG_KEY, code);
    reroll(code);
    if (code === CUSTOM) setEditing(true);
  }

  function setField<K extends keyof Character>(k: K, v: Character[K]) {
    setCharacter((c) => (c ? { ...c, [k]: v } : c));
  }

  async function start() {
    if (!character) return;
    if (language === CUSTOM && customLanguage.trim().length < 2) {
      setError("Indiquez la langue ou le dialecte que vous voulez pratiquer.");
      return;
    }
    const setup: ConversationSetup = {
      language, customLanguage: language === CUSTOM ? customLanguage.trim() : undefined,
      level, nativeLang, character: { ...character, name: character.name.trim(), city: character.city.trim() }, sceneIndex, context: context.trim(),
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
      if (!res.ok) throw new Error(data?.error?.message ?? "Impossible de créer la conversation.");
      router.push(`/c/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue.");
      setBusy(false);
    }
  }

  return (
    <>
      <section className="context" aria-labelledby="ctxTitle">
        <h2 id="ctxTitle">Dans quelle situation voulez-vous vous entraîner ?</h2>
        <p>Écrivez votre propre situation en une phrase, ou choisissez-en une ci-dessous.</p>
        <label className="label" htmlFor="ctx" hidden>Votre contexte</label>
        <textarea id="ctx" rows={2} maxLength={MAX_CONTEXT_LENGTH} value={context} onChange={(e) => setContext(e.target.value)}
          placeholder="Ex. : je veux faire la surprise à mon père en lui souhaitant son anniversaire dans sa langue" />
        <div className="chips">
          <button className="chip" type="button" aria-pressed={!context.trim() && sceneChoice === "r"}
            onClick={() => { setContext(""); setSceneChoice("r"); setRandomScene(randomSceneIndex()); }}>Au hasard</button>
          {SCENES.map((s, i) => (
            <button key={s[0]} className="chip" type="button" aria-pressed={!context.trim() && sceneChoice === i}
              onClick={() => { setContext(""); setSceneChoice(i); }}>{s[0]}</button>
          ))}
        </div>
      </section>

      <div className="controls">
        <label htmlFor="lang"><span className="label">Langue ou dialecte</span>
          <select id="lang" value={language} onChange={(e) => changeLanguage(e.target.value)}>
            <option value={CUSTOM}>✏️ Autre langue ou dialecte…</option>
            {BY_REGION.map((g) => (
              <optgroup key={g.region} label={g.region}>
                {g.langs.map((l) => <option key={l.code} value={l.code}>{l.fr} · {l.native}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <label htmlFor="level"><span className="label">Niveau</span>
          <select id="level" value={level} onChange={(e) => setLevel(e.target.value as Level)}>
            {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label htmlFor="native"><span className="label">Votre langue</span>
          <select id="native" value={nativeLang} onChange={(e) => setNativeLang(e.target.value)}>
            {NATIVE_LANGS.map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
      </div>

      {language === CUSTOM && (
        <label className="stack" style={{ gap: 4 }} htmlFor="customLang">
          <span className="label">Quelle langue ou quel dialecte ?</span>
          <input id="customLang" type="text" maxLength={MAX_FIELD_LENGTH} value={customLanguage} onChange={(e) => setCustomLanguage(e.target.value)}
            placeholder="Ex. : kabyle de Petite Kabylie, créole de Guyane, dialecte de Calabre, mooré…" />
          <span className="muted small">Toutes les langues sont possibles. Pour les dialectes rares, le personnage fera de son mieux. La voix peut être moins fidèle.</span>
        </label>
      )}

      <button className="btn" type="button" onClick={() => reroll()}>Générer un nouveau personnage</button>

      <article className="card" aria-live="polite">
        <div className="stamp">{level}</div>
        {character ? (
          <>
            <h2 className="who">
              {character.name.trim() || "Prénom choisi par le personnage"}, {character.age} ans{character.city.trim() ? `, ${character.city.trim()}` : ""}
            </h2>
            <ul className="facts">
              {[character.job, character.trait, "aime " + character.hobby, langLabel].map((x) => <li key={x}>{x}</li>)}
            </ul>
            <p className="scene"><b>{scene.title}</b> · {scene.description}.</p>
            <div>
              <button type="button" className="ghost" aria-expanded={editing} onClick={() => setEditing((v) => !v)}>
                {editing ? "Fermer la personnalisation" : "Personnaliser le personnage"}
              </button>
            </div>
            {editing && (
              <div className="controls">
                <label><span className="label">Prénom</span>
                  <input type="text" maxLength={MAX_FIELD_LENGTH} value={character.name} placeholder="Laisser vide : il·elle choisit" onChange={(e) => setField("name", e.target.value)} /></label>
                <label><span className="label">Ville ou région</span>
                  <input type="text" maxLength={MAX_FIELD_LENGTH} value={character.city} placeholder="Ex. : un village près de Tizi Ouzou" onChange={(e) => setField("city", e.target.value)} /></label>
                <label><span className="label">Âge</span>
                  <select value={character.age} onChange={(e) => setField("age", Number(e.target.value))}>
                    {Array.from({ length: 84 }, (_, i) => i + 16).map((a) => <option key={a} value={a}>{a} ans</option>)}
                  </select></label>
              </div>
            )}
          </>
        ) : <p className="muted">Préparation du personnage…</p>}
        <div className="chat">
          <button className="btn" type="button" onClick={start} disabled={busy || !character}>
            {busy ? "Préparation…" : signedIn ? "Commencer la conversation" : "Se connecter pour commencer"}
          </button>
          {error && <p className="msg note" role="alert">{error}</p>}
          {!signedIn && <p className="muted small" style={{ margin: 0, textAlign: "center" }}>Gratuit : quelques réponses par jour, sans carte bancaire.</p>}
        </div>
      </article>
    </>
  );
}
