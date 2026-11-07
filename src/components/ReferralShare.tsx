"use client";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
export default function ReferralShare({ link, amount }: { link: string; amount: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const text = t.growth.refShareText(amount);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <label className="label" htmlFor="reflink">{t.growth.refLink}</label>
      <div className="compose">
        <input id="reflink" type="text" readOnly value={link} onFocus={(e) => e.target.select()} />
        <button type="button" className="btn" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch {} }}>{copied ? t.growth.refCopied : t.growth.refCopy}</button>
      </div>
      <div className="row" style={{ justifyContent: "flex-start" }}>
        <a className="ghost" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`}>WhatsApp</a>
        <a className="ghost" href={`mailto:?subject=Alomundo&body=${encodeURIComponent(`${text} ${link}`)}`}>E-mail</a>
        <button type="button" className="ghost" onClick={() => { if (navigator.share) void navigator.share({ title: "Alomundo", text, url: link }).catch(() => {}); }}>{t.growth.refShare}</button>
      </div>
    </div>
  );
}
