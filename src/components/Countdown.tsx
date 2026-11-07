"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
export default function Countdown({ endsAt }: { endsAt: number }) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);
  const left = Math.max(0, endsAt - now);
  const h = Math.floor(left / 3_600_000);
  return <>{h >= 1 ? t.growth.hours(h) : t.growth.minutes(Math.max(1, Math.ceil(left / 60_000)))}</>;
}
