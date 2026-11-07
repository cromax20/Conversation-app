// Construction du chemin façon jeu mobile (cases du parcours).
import { LEVEL_ORDER, type Level } from "./characters";
import { PALIERS_PER_LEVEL, palierInfo } from "./progress";
import type { Sticker } from "./themes";

export type NodeState = "skipped" | "done" | "current" | "locked";
export type PathNode =
  | { kind: "tier"; level: Level; tier: number; state: NodeState; sticker: Sticker }
  | { kind: "exam"; level: Level; target: Level; state: NodeState }
  | { kind: "call"; level: Level; state: NodeState }
  | { kind: "trophy"; state: NodeState };

export function buildPath(p: { level: string; startLevel: string; xp: number }, stickers: Sticker[], callLevel: Level, callUnlocked: boolean): PathNode[] {
  const cur = Math.max(0, LEVEL_ORDER.indexOf(p.level as Level));
  const start = Math.max(0, LEVEL_ORDER.indexOf(p.startLevel as Level));
  const info = palierInfo(p.xp);
  const nodes: PathNode[] = [];
  let s = 0;
  LEVEL_ORDER.forEach((level, i) => {
    for (let tier = 1; tier <= PALIERS_PER_LEVEL; tier++) {
      let state: NodeState;
      if (i < start) state = "skipped";
      else if (i < cur) state = "done";
      else if (i > cur) state = "locked";
      else if (info.examReady || tier < info.palier) state = "done";
      else state = tier === info.palier ? "current" : "locked";
      nodes.push({ kind: "tier", level, tier, state, sticker: stickers[s++ % stickers.length] });
    }
    const target = LEVEL_ORDER[i + 1];
    if (target) {
      const state: NodeState = i < start ? "skipped" : i < cur ? "done" : i === cur && info.examReady ? "current" : "locked";
      nodes.push({ kind: "exam", level, target, state });
      if (target === callLevel) nodes.push({ kind: "call", level: target, state: callUnlocked ? "done" : "locked" });
    } else {
      nodes.push({ kind: "trophy", state: cur === LEVEL_ORDER.length - 1 ? "done" : "locked" });
    }
  });
  return nodes;
}
