"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteConversation({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button className="ghost" type="button" disabled={busy} aria-label={`Supprimer ${title}`}
      onClick={async () => {
        if (!confirm("Supprimer cette conversation ?")) return;
        setBusy(true);
        await fetch(`/api/conversations/${id}`, { method: "DELETE" });
        router.refresh();
      }}>
      Supprimer
    </button>
  );
}
