"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, LOCALE_COOKIE } from "@/i18n";
import { useI18n } from "@/i18n/client";

export default function LocaleSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="locale">
      <span className="sr-only">{t.nav.siteLanguage}</span>
      <span aria-hidden="true">🌐</span>
      <select aria-label={t.nav.siteLanguage} value={locale} disabled={pending}
        onChange={(e) => {
          document.cookie = `${LOCALE_COOKIE}=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
          void fetch("/api/me/locale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: e.target.value }) }).catch(() => {});
          start(() => router.refresh());
        }}>
        {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </label>
  );
}
