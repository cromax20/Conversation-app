"use client";
import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/client";
// Incitation à passer à Plus aux moments où l'élève en profite le plus.
export default function UpgradeCard({ reason, name = "" }: { reason: "limit" | "teaser" | "exam"; name?: string }) {
  const { t } = useI18n();
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  const g = t.growth;
  const title = reason === "limit" ? g.nudgeLimitTitle : reason === "exam" ? g.nudgeExamTitle : g.nudgeTeaserTitle(name);
  const text = reason === "limit" ? g.nudgeLimitText : reason === "exam" ? g.nudgeExamText : g.nudgeTeaserText;
  return (
    <aside className="upgrade" data-testid={`upgrade-${reason}`}>
      <span className="upgrade-icon" aria-hidden="true">{reason === "exam" ? "🎓" : reason === "limit" ? "🚀" : "🔊"}</span>
      <div className="stack" style={{ gap: 4 }}>
        <b>{title}</b>
        <span className="small">{text}</span>
        <span className="row" style={{ justifyContent: "flex-start" }}>
          <Link className="btn btn-glow" href="/abonnement">{g.nudgeCta}</Link>
          {reason !== "limit" && <button type="button" className="linkbtn small" onClick={() => setHidden(true)}>{g.nudgeLater}</button>}
        </span>
      </div>
    </aside>
  );
}
