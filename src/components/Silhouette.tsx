// Silhouettes de monuments (SVG, repère 400×300, sol vers y = 230).
export const SILHOUETTES = [
  "eiffel", "cathedral", "pyramids", "mosque", "pagoda", "torii", "fuji", "clocktower", "colosseum",
  "onion", "windmill", "redeemer", "baobab", "stupa", "lighthouse", "skyline", "castle", "volcano", "statue", "palace",
] as const;
export type SilhouetteKind = (typeof SILHOUETTES)[number];

export default function Silhouette({ kind, color = "#1f2233", glow, x = 250, scale = 1 }: { kind: SilhouetteKind; color?: string; glow?: string; x?: number; scale?: number }) {
  const lit = glow ?? "none";
  return (
    <g transform={`translate(${x} 0) scale(${scale}) translate(-50 0)`} fill={color}>
      {kind === "eiffel" && (
        <>
          <path d="M50 40 L53 40 L56 90 L64 130 L78 200 L90 232 L72 232 Q50 196 28 232 L10 232 L22 200 L36 130 L44 90 L47 40Z" />
          <rect x="34" y="128" width="32" height="5" /><rect x="26" y="168" width="48" height="5" /><rect x="49" y="28" width="2" height="14" />
        </>
      )}
      {kind === "cathedral" && (
        <>
          {[[14, 110], [30, 70], [46, 40], [62, 70], [78, 110]].map(([cx, top], i) => (
            <path key={i} d={`M${cx - 6} 232 L${cx - 6} ${top + 30} Q${cx} ${top - 10} ${cx + 6} ${top + 30} L${cx + 6} 232Z`} />
          ))}
          <rect x="6" y="170" width="84" height="62" />
          <circle cx="48" cy="190" r="9" fill={lit} />
        </>
      )}
      {kind === "pyramids" && (
        <><path d="M-30 232 L30 150 L90 232Z" /><path d="M50 232 L95 172 L140 232Z" opacity="0.85" /><path d="M-60 232 L-25 190 L10 232Z" opacity="0.75" /></>
      )}
      {kind === "mosque" && (
        <>
          <path d="M20 232 L20 170 Q50 120 80 170 L80 232Z" /><circle cx="50" cy="128" r="3" />
          <rect x="88" y="90" width="8" height="142" /><path d="M86 92 L92 74 L98 92Z" />
          <rect x="4" y="110" width="8" height="122" /><path d="M2 112 L8 94 L14 112Z" />
          <path d="M44 232 L44 205 Q50 196 56 205 L56 232Z" fill={lit} />
        </>
      )}
      {kind === "pagoda" && (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}><path d={`M${4 + i * 6} ${212 - i * 28} L${96 - i * 6} ${212 - i * 28} L${86 - i * 6} ${200 - i * 28} L${14 + i * 6} ${200 - i * 28}Z`} />
              <rect x={22 + i * 6} y={212 - i * 28} width={56 - i * 12} height="20" /></g>
          ))}
          <rect x="48" y="62" width="4" height="22" />
        </>
      )}
      {kind === "torii" && (
        <><path d="M-4 120 Q50 104 104 120 L104 130 Q50 116 -4 130Z" /><rect x="6" y="140" width="88" height="8" />
          <rect x="16" y="126" width="9" height="106" /><rect x="75" y="126" width="9" height="106" /><rect x="46" y="130" width="8" height="12" /></>
      )}
      {kind === "fuji" && (
        <><path d="M-80 232 L20 110 Q50 96 80 110 L180 232Z" /><path d="M20 110 Q50 96 80 110 L94 128 L78 122 L64 134 L50 122 L36 134 L22 122 L6 128Z" fill="#f4f4f4" /></>
      )}
      {kind === "clocktower" && (
        <><rect x="36" y="80" width="28" height="152" /><path d="M34 82 L50 40 L66 82Z" /><circle cx="50" cy="100" r="9" fill={glow ?? "#f4e9c8"} />
          <rect x="0" y="180" width="100" height="52" /></>
      )}
      {kind === "colosseum" && (
        <>
          <path d="M-10 232 L-10 150 Q50 120 110 150 L110 232Z" />
          {[0, 1, 2].map((r) => Array.from({ length: 8 }, (_, i) => (
            <path key={`${r}-${i}`} d={`M${-2 + i * 14} ${222 - r * 26} l0 -12 q4 -6 8 0 l0 12Z`} fill={lit === "none" ? "rgba(255,255,255,.18)" : lit} />
          )))}
        </>
      )}
      {kind === "onion" && (
        <>
          {[[20, 150], [50, 110], [80, 150]].map(([cx, top], i) => (
            <g key={i}><rect x={cx - 9} y={top + 26} width="18" height={232 - top - 26} />
              <path d={`M${cx - 14} ${top + 28} Q${cx - 16} ${top + 6} ${cx} ${top - 6} Q${cx + 16} ${top + 6} ${cx + 14} ${top + 28}Z`} />
              <rect x={cx - 1} y={top - 18} width="2" height="14" /></g>
          ))}
          <rect x="0" y="196" width="100" height="36" />
        </>
      )}
      {kind === "windmill" && (
        <><path d="M38 232 L42 140 L58 140 L62 232Z" /><path d="M36 142 L50 120 L64 142Z" />
          <g className="spin" style={{ transformOrigin: "50px 132px" }}>
            {[0, 90, 180, 270].map((a) => <rect key={a} x="48" y="70" width="4" height="62" transform={`rotate(${a} 50 132)`} />)}
          </g></>
      )}
      {kind === "redeemer" && (
        <><path d="M-40 232 Q20 150 50 140 Q80 150 140 232Z" /><rect x="47" y="70" width="6" height="72" /><rect x="22" y="84" width="56" height="6" /><circle cx="50" cy="64" r="6" /></>
      )}
      {kind === "baobab" && (
        <><path d="M38 232 Q34 170 40 140 L60 140 Q66 170 62 232Z" />
          <path d="M40 142 Q20 120 10 124 M44 140 Q36 112 30 104 M56 140 Q64 112 72 104 M60 142 Q82 120 92 124" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" />
          <ellipse cx="50" cy="110" rx="48" ry="16" /></>
      )}
      {kind === "stupa" && (
        <><path d="M6 232 L94 232 L86 200 L14 200Z" /><path d="M20 200 Q20 160 50 152 Q80 160 80 200Z" /><path d="M44 152 L50 90 L56 152Z" /></>
      )}
      {kind === "lighthouse" && (
        <><path d="M40 232 L44 120 L56 120 L60 232Z" /><rect x="40" y="104" width="20" height="16" fill={glow ?? "#ffe9a8"} /><path d="M38 106 L50 92 L62 106Z" />
          <path className="beam" d="M60 110 L170 90 L170 130Z" fill="#fff6c8" opacity="0.25" /></>
      )}
      {kind === "skyline" && (
        <>{[[0, 150], [16, 120], [30, 60], [44, 100], [58, 140], [72, 90], [86, 130]].map(([x0, y], i) => <rect key={i} x={x0} y={y} width="14" height={232 - y} />)}
          <path d="M33 60 L37 30 L41 60Z" /></>
      )}
      {kind === "castle" && (
        <><rect x="10" y="150" width="80" height="82" />
          {[10, 26, 42, 58, 74].map((x0) => <rect key={x0} x={x0} y="142" width="10" height="10" />)}
          <rect x="0" y="110" width="22" height="122" /><path d="M-2 112 L11 82 L24 112Z" /><rect x="78" y="110" width="22" height="122" /><path d="M76 112 L89 82 L102 112Z" />
          <path d="M42 232 L42 200 Q50 190 58 200 L58 232Z" fill={lit} /></>
      )}
      {kind === "volcano" && (
        <><path d="M-70 232 L30 120 L70 120 L170 232Z" /><path className="smoke" d="M44 116 q-10 -20 6 -32 q14 -12 4 -30" stroke="#d8d8d8" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.6" /></>
      )}
      {kind === "statue" && (
        <><rect x="30" y="180" width="40" height="52" /><path d="M40 180 L42 120 L58 120 L60 180Z" /><circle cx="50" cy="112" r="8" />
          <rect x="58" y="70" width="5" height="46" transform="rotate(10 60 116)" /><path d="M56 70 l6 -12 l6 12Z" fill={glow ?? "#ffd36b"} /></>
      )}
      {kind === "palace" && (
        <><rect x="0" y="170" width="100" height="62" /><path d="M30 170 Q50 120 70 170Z" /><rect x="48" y="112" width="4" height="14" />
          {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${8 + i * 20} 232 l0 -26 q6 -10 12 0 l0 26Z`} fill={lit === "none" ? "rgba(255,255,255,.15)" : lit} />)}
          <rect x="0" y="130" width="8" height="102" /><rect x="92" y="130" width="8" height="102" /></>
      )}
    </g>
  );
}
