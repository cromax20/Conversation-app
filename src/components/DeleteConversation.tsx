"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";

export default function DeleteConversation({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  return (
    <button className="ghost" type="button" disabled={busy} aria-label={`${t.list.delete} — ${title}`}
      onClick={async () => {
        if (!confirm(t.list.confirmDelete)) return;
        setBusy(true);
        await fetch(`/api/conversations/${id}`, { method: "DELETE" });
        router.refresh();
      }}>
      {t.list.delete}
    </button>
  );
}
