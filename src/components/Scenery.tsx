import type { Avatar } from "@/lib/avatar";

// Paysages illustrés (SVG) pour le fond des appels et du parcours.
const SKIES: Record<Avatar["time"], [string, string, string]> = {
  morning: ["#ffd9b8", "#ffeedd", "#bfe0ff"],
  day: ["#5aa9f0", "#9fd0ff", "#dff1ff"],
  sunset: ["#3b2a6b", "#e8745a", "#ffc27a"],
  night: ["#050b24", "#14204a", "#2b3a6e"],
};

function shade(time: Avatar["time"], day: string, night: string) {
  return time === "night" ? night : day;
}

export default function Scenery({ scenery, time, className, accent }: { scenery: Avatar["scenery"]; time: Avatar["time"]; className?: string; accent?: string }) {
  const [top, mid, low] = SKIES[time];
  const id = `sky-${scenery}-${time}`;
  const sunY = time === "sunset" ? 190 : time === "morning" ? 150 : 70;
  const g = (d: string, n: string) => shade(time, d, n);
  return (
    <svg className={className} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} /><stop offset="0.6" stopColor={mid} /><stop offset="1" stopColor={low} />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${id})`} />
      {time === "night" ? (
        <>
          {[[40, 30], [90, 60], [150, 25], [220, 50], [280, 20], [340, 70], [370, 35], [60, 100], [310, 110]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 ? 1.2 : 1.8} fill="#fff" opacity="0.85" />
          ))}
          <circle cx="320" cy="60" r="18" fill="#f4f1de" /><circle cx="328" cy="55" r="16" fill={top} />
        </>
      ) : (
        <circle cx="300" cy={sunY} r={time === "sunset" ? 34 : 24} fill={time === "sunset" ? "#ffb347" : time === "morning" ? "#ffcf7a" : "#fff3b0"} opacity="0.95" />
      )}
      {time !== "night" && (
        <g fill="#fff" opacity={time === "sunset" ? 0.35 : 0.8}>
          <ellipse cx="80" cy="60" rx="34" ry="10" /><ellipse cx="105" cy="54" rx="22" ry="10" />
          <ellipse cx="230" cy="40" rx="28" ry="8" />
        </g>
      )}

      {scenery === "mountains" && (
        <>
          <path d="M0 210 L70 120 L120 170 L190 90 L260 175 L320 115 L400 190 L400 300 L0 300Z" fill={g("#7d8fb3", "#28335a")} />
          <path d="M190 90 L172 112 L184 108 L192 118 L202 106 L212 114Z" fill="#fff" opacity="0.9" />
          <path d="M320 115 L306 132 L318 128 L326 136 L334 128Z" fill="#fff" opacity="0.9" />
          <path d="M0 240 L90 185 L170 230 L260 195 L400 245 L400 300 L0 300Z" fill={g("#4f7a4a", "#1d3326")} />
          <path d="M0 270 Q200 240 400 270 L400 300 L0 300Z" fill={g("#3f6a3a", "#16281d")} />
        </>
      )}
      {scenery === "sea" && (
        <>
          <path d="M0 195 L400 195 L400 300 L0 300Z" fill={g("#2f7fc0", "#0d2347")} />
          <path d="M0 205 Q50 200 100 205 T200 205 T300 205 T400 205" stroke="#fff" strokeOpacity="0.5" fill="none" />
          <path d="M0 225 Q50 220 100 225 T200 225 T300 225 T400 225" stroke="#fff" strokeOpacity="0.35" fill="none" />
          <path d="M0 255 Q120 235 260 255 T400 250 L400 300 L0 300Z" fill={g("#efd9a7", "#5a5040")} />
          <path d="M40 255 Q48 210 60 190" stroke={g("#6b4a2a", "#2b1e12")} strokeWidth="5" fill="none" />
          <path d="M60 190 q-24 -2 -36 10 M60 190 q20 -10 36 0 M60 190 q-6 -18 -22 -22 M60 190 q12 -16 28 -14" stroke={g("#2f8a4a", "#173d24")} strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M300 190 l14 -22 l2 22 Z" fill="#fff" opacity="0.9" />
        </>
      )}
      {scenery === "desert" && (
        <>
          <path d="M0 220 Q90 170 180 215 T400 205 L400 300 L0 300Z" fill={g("#e2b06a", "#5a4428")} />
          <path d="M0 255 Q120 215 240 255 T400 250 L400 300 L0 300Z" fill={g("#cf9550", "#45331d")} />
          <g fill={g("#7a5a2a", "#2b1f10")}>
            <path d="M300 205 q0 -26 6 -26 q6 0 6 26 Z" /><path d="M294 196 q0 -10 6 -10 l0 10Z" /><path d="M318 192 q0 -12 -6 -12 l0 12Z" />
          </g>
          <path d="M90 210 l40 -40 l40 40 Z" fill={g("#d9a85a", "#4a3820")} />
          <path d="M150 214 l26 -26 l26 26 Z" fill={g("#c99848", "#40301b")} />
        </>
      )}
      {scenery === "city" && (
        <>
          <g fill={g("#6f7d99", "#1a2344")}>
            <rect x="10" y="140" width="40" height="160" /><rect x="55" y="110" width="35" height="190" /><rect x="95" y="160" width="45" height="140" />
            <rect x="150" y="90" width="30" height="210" /><rect x="185" y="130" width="50" height="170" /><rect x="245" y="100" width="35" height="200" />
            <rect x="290" y="150" width="45" height="150" /><rect x="340" y="120" width="50" height="180" />
          </g>
          <g fill={time === "night" ? "#ffd36b" : "#cfe3ff"} opacity={time === "night" ? 0.9 : 0.6}>
            {Array.from({ length: 36 }, (_, i) => <rect key={i} x={16 + (i * 37) % 370} y={150 + ((i * 53) % 120)} width="6" height="8" />)}
          </g>
          <rect x="0" y="270" width="400" height="30" fill={g("#4a5266", "#0e1428")} />
        </>
      )}
      {scenery === "countryside" && (
        <>
          <path d="M0 200 Q100 160 200 195 T400 185 L400 300 L0 300Z" fill={g("#8cc46a", "#24401f")} />
          <path d="M0 240 Q130 200 260 240 T400 235 L400 300 L0 300Z" fill={g("#6aa84f", "#1c3519")} />
          <g stroke={g("#c9a55a", "#4a3d22")} strokeWidth="2" opacity="0.6">
            <path d="M0 260 Q200 240 400 262" fill="none" /><path d="M0 280 Q200 262 400 284" fill="none" />
          </g>
          <circle cx="90" cy="185" r="16" fill={g("#3f7a3a", "#153018")} /><rect x="87" y="195" width="6" height="18" fill="#5a3a22" />
          <rect x="280" y="178" width="34" height="24" fill={g("#f2e6d0", "#4a4438")} /><path d="M276 180 l21 -16 l21 16Z" fill={accent ?? "#c8412e"} />
        </>
      )}
      {scenery === "tropical" && (
        <>
          <path d="M0 210 Q80 150 160 200 T320 180 T400 200 L400 300 L0 300Z" fill={g("#2f8a4a", "#123321")} />
          <path d="M0 250 Q120 215 240 250 T400 245 L400 300 L0 300Z" fill={g("#1f6e3a", "#0c2617")} />
          {[[60, 250], [340, 245], [200, 240]].map(([x, y], i) => (
            <g key={i}>
              <path d={`M${x} ${y} Q${x + 6} ${y - 40} ${x + 14} ${y - 70}`} stroke={g("#6b4a2a", "#2b1e12")} strokeWidth="5" fill="none" />
              <path d={`M${x + 14} ${y - 70} q-26 -2 -38 12 M${x + 14} ${y - 70} q22 -10 38 2 M${x + 14} ${y - 70} q-6 -20 -24 -24 M${x + 14} ${y - 70} q14 -16 30 -12`} stroke={g("#3aa35a", "#18482a")} strokeWidth="7" fill="none" strokeLinecap="round" />
            </g>
          ))}
          <circle cx="120" cy="262" r="5" fill="#ff6b8a" /><circle cx="270" cy="258" r="5" fill="#ffb347" />
        </>
      )}
      {scenery === "snow" && (
        <>
          <path d="M0 200 L80 130 L150 185 L230 110 L310 180 L400 140 L400 300 L0 300Z" fill={g("#dfe8f3", "#5a6688")} />
          <path d="M0 240 Q120 210 240 240 T400 232 L400 300 L0 300Z" fill={g("#f7fbff", "#8d97b5")} />
          {[[70, 230], [110, 238], [330, 228]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y} l-14 0 l14 -22 l-10 0 l10 -18 l10 18 l-10 0 l14 22Z`} fill={g("#2f6a4a", "#1a3328")} />
          ))}
          <g fill="#fff" opacity="0.9">{Array.from({ length: 20 }, (_, i) => <circle key={i} cx={(i * 47) % 400} cy={(i * 29) % 180} r="1.6" />)}</g>
        </>
      )}
      {scenery === "village" && (
        <>
          <path d="M0 210 Q100 180 200 205 T400 195 L400 300 L0 300Z" fill={g("#9cc47a", "#2a4524")} />
          {[[40, 190, "#f2e6d0"], [100, 182, "#f5d9b0"], [165, 192, "#efe0c8"], [250, 186, "#f5d9b0"], [320, 190, "#f2e6d0"]].map(([x, y, c], i) => (
            <g key={i}>
              <rect x={x as number} y={y as number} width="44" height="32" fill={g(c as string, "#4a4438")} />
              <path d={`M${(x as number) - 4} ${(y as number) + 2} l26 -20 l26 20Z`} fill={accent ?? "#b8553a"} />
              <rect x={(x as number) + 16} y={(y as number) + 14} width="10" height="18" fill="#6b4a2a" />
              <rect x={(x as number) + 4} y={(y as number) + 8} width="8" height="8" fill={time === "night" ? "#ffd36b" : "#9fd0ff"} />
            </g>
          ))}
          <path d="M0 260 Q200 240 400 262 L400 300 L0 300Z" fill={g("#7aa85a", "#1f3a1c")} />
        </>
      )}
    </svg>
  );
}
