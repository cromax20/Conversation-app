"use client";

import { useEffect, useState } from "react";
import type { Avatar } from "@/lib/avatar";
import type { Theme } from "@/lib/themes";
import type { SilhouetteKind } from "./Silhouette";
import Scenery from "./Scenery";
import Ambience from "./Ambience";

type Kind = Exclude<Avatar["scenery"], "country">;

// Décor qui va avec un monument (phare → mer, Fuji → montagnes…).
function sceneryFor(sil: SilhouetteKind, fallback: Kind): Kind {
  switch (sil) {
    case "fuji": case "volcano": case "redeemer": return "mountains";
    case "lighthouse": return "sea";
    case "skyline": case "clocktower": case "statue": case "eiffel": return "city";
    case "baobab": case "windmill": return "countryside";
    case "pyramids": return "desert";
    default: return fallback;
  }
}

/**
 * Fond animé d'un appel : paysages du pays qui se succèdent en fondu, avec un lent zoom,
 * ou un paysage choisi à la main.
 */
export default function CountryBackdrop({ theme, scenery, time, className, interval = 14000 }: {
  theme: Theme; scenery: Avatar["scenery"]; time: Avatar["time"]; className?: string; interval?: number;
}) {
  // Mode « pays » : les monuments se succèdent, et l'heure change d'une scène à l'autre.
  const cycle: Avatar["time"][] = [time, time === "sunset" ? "night" : "sunset", time === "night" ? "day" : "night"];
  const scenes = scenery === "country"
    ? theme.silhouettes.map((sil, i) => ({ scenery: i === 0 ? theme.scenery : sceneryFor(sil, theme.scenery), silhouette: sil, time: cycle[i % cycle.length] }))
    : [{ scenery: scenery as Kind, silhouette: theme.silhouettes[0], time }];
  const lanterns = theme.silhouettes.some((s) => s === "pagoda" || s === "torii" || s === "stupa");
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (scenes.length < 2) return;
    const id = setInterval(() => setActive((a) => (a + 1) % scenes.length), interval);
    return () => clearInterval(id);
  }, [scenes.length, interval]);

  return (
    <div className={`backdrop ${className ?? ""}`} aria-hidden="true" data-scene={active}>
      {scenes.map((s, i) => (
        <div key={`${s.scenery}-${s.silhouette}-${i}`} className="scene-layer" style={{ opacity: i === active ? 1 : 0 }}>
          <div className="kenburns layer-fill">
            <Scenery scenery={s.scenery} time={s.time} animated silhouette={s.silhouette} silhouetteX={i % 2 ? 110 : 290} accent={theme.colors[0]} />
            {i === active && <Ambience scenery={s.scenery} time={s.time} colors={theme.colors} lanterns={lanterns} />}
          </div>
        </div>
      ))}
      <div className="vignette" />
    </div>
  );
}
