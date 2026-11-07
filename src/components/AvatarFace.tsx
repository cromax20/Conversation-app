import type { Expression } from "@/lib/characters";
import { EYE_COLORS, HAIR_COLORS, HEADSCARF_COLORS, OUTFITS, SKIN_TONES, type Avatar } from "@/lib/avatar";

// Visage illustré et animé. `mouth` (0 à 1) ouvre la bouche quand le personnage parle.
export default function AvatarFace({ avatar, expression = "neutre", mouth = 0, age = 35, className }: {
  avatar: Avatar; expression?: Expression; mouth?: number; age?: number; className?: string;
}) {
  const skin = SKIN_TONES[avatar.skin];
  const hair = HAIR_COLORS[avatar.hairColor];
  const eye = EYE_COLORS[avatar.eyes];
  const outfit = OUTFITS[avatar.outfit];
  const scarf = HEADSCARF_COLORS[avatar.outfit % HEADSCARF_COLORS.length];
  const hs = avatar.hairStyle;
  const laugh = expression === "rire";
  const smile = expression === "sourire" || laugh;
  const brow = { neutre: 0, sourire: -1, rire: -2, surpris: -7, pensif: 3, inquiet: 5 }[expression];
  const browTilt = expression === "inquiet" ? -6 : expression === "pensif" ? 4 : 0;
  const open = Math.max(mouth, expression === "surpris" ? 0.5 : laugh ? 0.55 : 0);
  const eyeH = laugh ? 0.6 : expression === "surpris" ? 6.5 : 5;

  return (
    <svg className={className} viewBox="0 0 200 240" role="img" aria-label="avatar">
      {/* Cheveux arrière */}
      {hs === "long" && <path d="M48 95 Q44 190 70 205 L130 205 Q156 190 152 95 Z" fill={hair} />}
      {hs === "braids" && (
        <g fill={hair}>
          <path d="M52 100 Q46 160 58 210 l12 0 Q62 160 66 100Z" /><path d="M148 100 Q154 160 142 210 l-12 0 Q138 160 134 100Z" />
        </g>
      )}
      {hs === "bun" && <circle cx="100" cy="38" r="20" fill={hair} />}
      {hs === "afro" && <circle cx="100" cy="88" r="64" fill={hair} />}
      {hs === "headscarf" && <path d="M40 100 Q40 30 100 28 Q160 30 160 100 L168 215 L32 215 Z" fill={scarf} />}

      {/* Épaules et tenue */}
      <path d="M30 240 Q34 190 80 180 L120 180 Q166 190 170 240 Z" fill={outfit} />
      <path d="M86 168 L114 168 L116 186 Q100 196 84 186 Z" fill={skin} />
      {hs === "headscarf" && <path d="M64 175 Q100 200 136 175 L140 200 Q100 215 60 200 Z" fill={scarf} />}

      {/* Oreilles et visage */}
      {hs !== "headscarf" && (<><ellipse cx="54" cy="108" rx="8" ry="12" fill={skin} /><ellipse cx="146" cy="108" rx="8" ry="12" fill={skin} /></>)}
      {avatar.earrings && hs !== "headscarf" && (<><circle cx="54" cy="124" r="3.5" fill="#e0b84a" /><circle cx="146" cy="124" r="3.5" fill="#e0b84a" /></>)}
      <ellipse cx="100" cy="104" rx="46" ry="58" fill={skin} />
      {age >= 55 && (<g stroke="#000" strokeOpacity="0.12" strokeWidth="1.4" fill="none"><path d="M70 76 q30 -6 60 0" /><path d="M64 118 q-4 6 0 12" /><path d="M136 118 q4 6 0 12" /></g>)}

      {/* Cheveux avant */}
      {hs === "short" && <path d="M54 92 Q52 44 100 42 Q148 44 146 92 Q130 66 100 64 Q72 66 54 92Z" fill={hair} />}
      {hs === "long" && <path d="M52 100 Q50 42 100 40 Q150 42 148 100 Q140 62 100 60 Q62 62 52 100Z" fill={hair} />}
      {hs === "curly" && (
        <g fill={hair}>{[[60, 70], [74, 56], [92, 50], [110, 50], [128, 56], [142, 70], [52, 88], [148, 88]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="13" />)}</g>
      )}
      {hs === "bun" && <path d="M54 92 Q54 46 100 44 Q146 46 146 92 Q132 64 100 62 Q68 64 54 92Z" fill={hair} />}
      {hs === "afro" && <path d="M56 86 Q60 52 100 50 Q140 52 144 86 Q126 70 100 68 Q74 70 56 86Z" fill={hair} />}
      {hs === "braids" && <path d="M54 94 Q52 44 100 42 Q148 44 146 94 Q132 64 100 62 Q68 64 54 94Z" fill={hair} />}
      {hs === "shaved" && <path d="M56 86 Q58 48 100 46 Q142 48 144 86 Q128 62 100 60 Q72 62 56 86Z" fill={hair} opacity="0.35" />}
      {hs === "headscarf" && <path d="M52 100 Q52 44 100 42 Q148 44 148 100 Q136 66 100 64 Q64 66 52 100Z" fill={scarf} />}

      {/* Sourcils */}
      <g stroke={hs === "headscarf" ? "#3a2a20" : hair} strokeWidth="4" strokeLinecap="round" style={{ transition: "transform .25s" }}>
        <path d={`M70 ${84 + brow + browTilt / 2} L90 ${84 + brow - browTilt / 2}`} />
        <path d={`M110 ${84 + brow - browTilt / 2} L130 ${84 + brow + browTilt / 2}`} />
      </g>

      {/* Yeux (avec clignement) */}
      <g className="avatar-eyes">
        <ellipse cx="80" cy="100" rx="7" ry={eyeH} fill="#fff" />
        <ellipse cx="120" cy="100" rx="7" ry={eyeH} fill="#fff" />
        {!laugh && (<><circle cx="80" cy="101" r="4" fill={eye} /><circle cx="120" cy="101" r="4" fill={eye} /><circle cx="81.5" cy="99.5" r="1.2" fill="#fff" /><circle cx="121.5" cy="99.5" r="1.2" fill="#fff" /></>)}
        {laugh && (<g stroke="#3a2a20" strokeWidth="3" fill="none" strokeLinecap="round"><path d="M73 102 q7 -7 14 0" /><path d="M113 102 q7 -7 14 0" /></g>)}
      </g>
      {avatar.glasses && (
        <g stroke="#2b2f3a" strokeWidth="2.5" fill="none"><circle cx="80" cy="100" r="13" /><circle cx="120" cy="100" r="13" /><path d="M93 100 h14 M67 98 l-12 -4 M133 98 l12 -4" /></g>
      )}

      {/* Nez et joues */}
      <path d="M100 106 q-5 14 0 18 q4 1 7 -1" stroke="#000" strokeOpacity="0.18" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {smile && (<><circle cx="70" cy="124" r="7" fill="#ff6b6b" opacity="0.18" /><circle cx="130" cy="124" r="7" fill="#ff6b6b" opacity="0.18" /></>)}

      {/* Barbe */}
      {avatar.beard === "stubble" && <path d="M58 118 Q60 160 100 164 Q140 160 142 118 Q132 150 100 152 Q68 150 58 118Z" fill={hair} opacity="0.3" />}
      {avatar.beard === "full" && <path d="M56 112 Q56 168 100 172 Q144 168 144 112 Q136 150 100 150 Q64 150 56 112Z" fill={hair} />}
      {(avatar.beard === "moustache" || avatar.beard === "full") && <path d="M84 132 Q100 124 116 132 Q100 130 84 132Z" fill={hair} stroke={hair} strokeWidth="4" strokeLinejoin="round" />}

      {/* Bouche */}
      {open > 0.08 ? (
        <ellipse cx="100" cy={140 + open * 2} rx={smile ? 14 : 10} ry={3 + open * 9} fill="#6b2a2a" />
      ) : smile ? (
        <path d="M84 136 Q100 150 116 136" stroke="#7a3a2a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      ) : expression === "inquiet" ? (
        <path d="M88 142 Q100 134 112 142" stroke="#7a3a2a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      ) : expression === "pensif" ? (
        <path d="M90 140 L110 137" stroke="#7a3a2a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M88 139 Q100 144 112 139" stroke="#7a3a2a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}
