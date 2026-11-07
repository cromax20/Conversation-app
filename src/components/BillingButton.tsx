"use client";

import { useState } from "react";

export default function BillingButton({ kind, label, primary = true }: { kind: "checkout" | "portal"; label: string; primary?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="stack" style={{ gap: 6 }}>
      <button className={primary ? "btn" : "ghost"} type="button" disabled={busy}
        onClick={async () => {
          setBusy(true); setError("");
          const res = await fetch(`/api/billing/${kind}`, { method: "POST" });
          const data = await res.json().catch(() => null);
          if (res.ok && data?.url) { window.location.href = data.url; return; }
          setError(data?.error?.message ?? "Une erreur est survenue.");
          setBusy(false);
        }}>
        {busy ? "Redirection…" : label}
      </button>
      {error && <p className="muted small" role="alert" style={{ margin: 0 }}>{error}</p>}
    </div>
  );
}
