"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";

export default function ExamButton({ progressKey, target }: { progressKey: string; target: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="stack" style={{ gap: 4 }}>
      <button className="btn" type="button" disabled={busy} onClick={async () => {
        setBusy(true); setError("");
        const res = await fetch("/api/progress/exam", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: progressKey }) });
        const data = await res.json().catch(() => null);
        if (res.ok) { router.push(`/c/${data.id}`); return; }
        setError(t.errors[data?.error?.code as keyof typeof t.errors] ?? t.chat.unexpected);
        setBusy(false);
      }}>{busy ? t.home.starting : t.exam.start(target)}</button>
      {error && <span className="muted small" role="alert">{error}</span>}
    </div>
  );
}
