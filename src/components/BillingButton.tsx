"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";

export default function BillingButton({ kind, label, primary = true }: { kind: "checkout" | "portal"; label: string; primary?: boolean }) {
  const { t } = useI18n();
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
          setError(t.errors[data?.error?.code as keyof typeof t.errors] ?? t.pricing.error);
          setBusy(false);
        }}>
        {busy ? t.pricing.redirecting : label}
      </button>
      {error && <p className="muted small" role="alert" style={{ margin: 0 }}>{error}</p>}
    </div>
  );
}
