import Link from "next/link";
import { getI18n } from "@/i18n/server";
export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main className="wrap">
      <h1>{t.notFound.title}</h1>
      <p className="lede"><Link href="/">{t.notFound.back}</Link></p>
    </main>
  );
}
