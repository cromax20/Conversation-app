"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import Countdown from "./Countdown";
export default function OfferBar({ endsAt, percent }: { endsAt: number; percent: number }) {
  const { t } = useI18n();
  const path = usePathname();
  if (path?.startsWith("/appel/") && path !== "/appel/nouveau") return null; // pas pendant un appel
  const [before, after] = t.growth.offerBar(percent, "§").split("§");
  return (
    <div className="offerbar" data-testid="offer-bar">
      <span>{before}<b><Countdown endsAt={endsAt} /></b>{after}</span>
      <Link href="/abonnement" className="offerbar-cta">{t.growth.offerCta} →</Link>
    </div>
  );
}
