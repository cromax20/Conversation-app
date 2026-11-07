"use client";

import { useWrittenMode } from "@/lib/useWrittenMode";
import { useI18n } from "@/i18n/client";

export default function WrittenToggle({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const [on, set] = useWrittenMode();
  return (
    <label className={`written-toggle ${className}`} title={t.written.help}>
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />
      <span>{t.written.label}</span>
    </label>
  );
}
