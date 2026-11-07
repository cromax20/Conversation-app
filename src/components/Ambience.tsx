import type { Avatar } from "@/lib/avatar";

type Kind = Exclude<Avatar["scenery"], "country">;

// Couche de vie au-dessus du paysage : animaux, passants, véhicules, lumières. Repère 400×300.
export default function Ambience({ scenery, time, colors, lanterns = false }: { scenery: Kind; time: Avatar["time"]; colors: [string, string, string]; lanterns?: boolean }) {
  const night = time === "night";
  const dusk = time === "sunset";
  const [c1, c2, c3] = colors;
  const ink = night ? "#0b1026" : dusk ? "#2a1d33" : "#33405a";
  return (
    <svg className="ambience anim" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {/* Rayons de soleil */}
      {!night && (
        <>
          <defs>
            <radialGradient id="ray-glow" cx="300" cy="80" r="260" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#fff6c8" stopOpacity=".55" /><stop offset="1" stopColor="#fff6c8" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g className="rays" style={{ transformOrigin: "300px 80px", mixBlendMode: "screen" }} opacity={dusk ? 0.5 : 0.35}>
            {Array.from({ length: 12 }, (_, i) => <path key={i} d="M300 80 L294 -180 L306 -180Z" fill="url(#ray-glow)" transform={`rotate(${i * 30} 300 80)`} />)}
          </g>
        </>
      )}

      {/* Montgolfières aux couleurs du pays */}
      {!night && (scenery === "mountains" || scenery === "countryside" || scenery === "desert" || scenery === "village") && (
        <>
          {[[70, c1, c2, 0], [180, c3, c1, -9], [330, c2, c3, -18]].map(([x, a, b, d], i) => (
            <g key={i} className="balloon" style={{ animationDelay: `${d}s` }}>
              <g transform={`translate(${x} 0)`}>
                <path d="M0 -14 C-12 -14 -14 2 -6 10 L-3 16 L3 16 L6 10 C14 2 12 -14 0 -14Z" fill={a as string} />
                <path d="M0 -14 C-4 -14 -5 2 -2 10 L-1 16 L1 16 L2 10 C5 2 4 -14 0 -14Z" fill={b as string} opacity=".85" />
                <rect x="-3" y="18" width="6" height="5" rx="1" fill="#6b4a2a" />
              </g>
            </g>
          ))}
        </>
      )}

      {/* Cerf-volant */}
      {!night && (scenery === "sea" || scenery === "countryside" || scenery === "city") && (
        <g className="kite">
          <path d="M0 -10 L8 0 L0 14 L-8 0Z" fill={c1} /><path d="M0 -10 L0 14 M-8 0 L8 0" stroke="#fff" strokeWidth=".8" />
          <path d="M0 14 q6 10 -2 18 q-8 10 2 20 q6 8 0 30" stroke={ink} strokeWidth=".6" fill="none" />
        </g>
      )}

      {/* Papillons */}
      {!night && (scenery === "countryside" || scenery === "village" || scenery === "tropical") && (
        <>{[0, 1, 2].map((i) => (
          <g key={i} className="butterfly" style={{ animationDelay: `${i * -4}s`, animationDuration: `${14 + i * 3}s` }}>
            <g className="flap"><path d="M0 0 q-6 -6 -8 0 q2 6 8 0 q6 -6 8 0 q-2 6 -8 0" fill={[c1, c2, c3][i]} /></g>
          </g>
        ))}</>
      )}

      {/* Bord de mer : voiliers, mouettes, scintillements */}
      {scenery === "sea" && (
        <>
          <g className="sail s1"><path d="M0 0 L0 -18 L12 0Z" fill="#fff" /><path d="M-6 0 L16 0 L12 5 L-2 5Z" fill={c1} /></g>
          <g className="sail s2"><path d="M0 0 L0 -12 L8 0Z" fill="#fff" opacity=".9" /><path d="M-4 0 L11 0 L8 3 L-1 3Z" fill={c3} /></g>
          {!night && <g className="gull" stroke={ink} strokeWidth="1.4" fill="none"><path d="M0 0 q5 -5 10 0 q5 -5 10 0" /></g>}
          {Array.from({ length: 10 }, (_, i) => <circle key={i} className="sparkle" style={{ animationDelay: `${i * 0.4}s` }} cx={20 + i * 38} cy={200 + (i % 3) * 12} r="1.4" fill="#fff" />)}
        </>
      )}

      {/* Ville : tram, passants, phares */}
      {scenery === "city" && (
        <>
          <g className="tram">
            <rect x="0" y="252" width="70" height="20" rx="4" fill={c1} /><rect x="6" y="256" width="58" height="7" fill={night ? "#ffd36b" : "#cfe3ff"} />
            <circle cx="14" cy="274" r="3" fill="#222" /><circle cx="56" cy="274" r="3" fill="#222" />
          </g>
          {[0, 1, 2, 3].map((i) => (
            <g key={i} className={`walker w${i}`} style={{ animationDelay: `${i * -6}s` }} fill={ink}>
              <circle cx="0" cy="-15" r="2.6" /><rect x="-2.2" y="-12" width="4.4" height="9" rx="2" fill={[c1, c2, c3, ink][i]} />
              <g className="legs"><rect x="-2" y="-3" width="1.6" height="6" /><rect x="0.6" y="-3" width="1.6" height="6" /></g>
            </g>
          ))}
          {night && <g className="carlights"><circle cx="0" cy="282" r="2.2" fill="#fff6c8" /><circle cx="8" cy="282" r="2.2" fill="#fff6c8" /></g>}
        </>
      )}

      {/* Désert : caravane */}
      {scenery === "desert" && (
        <g className="caravan" fill={ink}>
          {[0, 26, 52].map((dx) => (
            <g key={dx} transform={`translate(${dx} 0)`}>
              <path d="M0 236 q2 -10 10 -10 q4 -8 8 0 q6 0 8 6 l4 -6 q3 0 2 4 l-4 8 l0 10 l-2 0 l0 -8 l-14 0 l0 8 l-2 0Z" />
            </g>
          ))}
        </g>
      )}

      {/* Montagnes : aigle et parapente */}
      {scenery === "mountains" && !night && (
        <>
          <g className="eagle" style={{ transformOrigin: "150px 90px" }} stroke={ink} strokeWidth="1.8" fill="none"><path d="M0 0 q6 -5 12 0 q6 -5 12 0" /></g>
          <g className="glider"><path d="M-14 0 Q0 -10 14 0" stroke={c2} strokeWidth="4" fill="none" strokeLinecap="round" /><path d="M-12 0 L0 14 L12 0" stroke={ink} strokeWidth=".5" fill="none" /><circle cx="0" cy="16" r="2" fill={ink} /></g>
        </>
      )}

      {/* Neige : aurore boréale la nuit */}
      {scenery === "snow" && night && (
        <g className="aurora" opacity=".55">
          <path d="M-20 70 Q60 20 140 60 T300 50 T420 60 L420 110 Q340 80 260 100 T100 100 T-20 110Z" fill="#3fe0a0" />
          <path d="M-20 90 Q80 50 160 80 T320 70 T420 80 L420 120 Q330 100 250 115 T90 118 T-20 125Z" fill="#7c5cff" opacity=".6" />
        </g>
      )}

      {/* Nuit : lucioles, étoiles filantes */}
      {night && (scenery === "countryside" || scenery === "village" || scenery === "tropical" || scenery === "mountains") && (
        <>{Array.from({ length: 14 }, (_, i) => (
          <circle key={i} className="firefly" style={{ animationDelay: `${(i * 0.53) % 5}s`, animationDuration: `${4 + (i % 4)}s` }} cx={(i * 31) % 400} cy={190 + ((i * 17) % 90)} r="1.6" fill="#f5ff9e" />
        ))}</>
      )}
      {night && <path className="shooting" d="M0 0 L-40 14" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />}

      {/* Lanternes (thèmes d'Asie), au crépuscule et la nuit */}
      {lanterns && (night || dusk) && (
        <>{Array.from({ length: 7 }, (_, i) => (
          <g key={i} className="lantern" style={{ animationDelay: `${i * -2.3}s`, animationDuration: `${16 + (i % 3) * 4}s` }}>
            <g transform={`translate(${30 + i * 55} 0)`}><rect x="-4" y="-6" width="8" height="10" rx="3" fill="#ffb347" /><rect x="-4" y="-6" width="8" height="10" rx="3" fill="#ff7a59" opacity=".5" /></g>
          </g>
        ))}</>
      )}
    </svg>
  );
}
