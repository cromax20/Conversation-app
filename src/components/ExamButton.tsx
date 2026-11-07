"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ExamButton({ progressKey, target }: { progressKey: string; target: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="stack" style={{ gap: 4 }}>
      <button className="btn" type="button" disabled={busy} onClick={async () => {
        setBusy(true); setError("");
        const res = await fetch("/api/progress/exam", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: progressKey }) });
        const data = await res.json().catch(() => null);
        if (res.ok) { router.push(`/c/${data.id}`); return; }
        setError(data?.error?.message ?? "Impossible de lancer l'épreuve.");
        setBusy(false);
      }}>{busy ? "Préparation…" : `Passer l'épreuve ${target}`}</button>
      {error && <span className="muted small" role="alert">{error}</span>}
    </div>
  );
}
