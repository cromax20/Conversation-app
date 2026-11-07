import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { freeCallActive, freeCallMinutes, freeCallUnlocked } from "@/lib/calls";
import { quotaFor } from "@/lib/plan";
import { DEFAULT_AVATAR, parseAvatar } from "@/lib/avatar";
import { getI18n } from "@/i18n/server";
import { storedLanguageLabel } from "@/i18n";
import CallRoom from "@/components/CallRoom";
import { themeFor } from "@/lib/themes";

export default async function CallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?callbackUrl=/appel/${id}`);
  const { locale, t } = await getI18n();

  const conv = await prisma.conversation.findFirst({
    where: { id, userId: user.id, mode: "call" },
    include: { messages: { orderBy: { createdAt: "asc" }, select: { id: true, role: true, text: true } } },
  });
  if (!conv) notFound();
  const progress = await prisma.languageProgress.findUnique({ where: { userId_key: { userId: user.id, key: conv.progressKey } } });
  const quota = await quotaFor(user.id, user);
  const planCalls = quota.features.calls;
  if (!planCalls && !freeCallUnlocked(progress)) redirect(`/appel/nouveau?key=${encodeURIComponent(conv.progressKey)}`);
  // Appel gratuit : 10 minutes à partir de sa création.
  if (!planCalls && !freeCallActive(conv)) {
    return (
      <main className="wrap">
        <h1>📵 {t.call.ended}</h1>
        <p className="lede">{t.errors.call_time_up}</p>
        <p><Link className="btn" href="/abonnement">{t.chat.seePlan}</Link> <Link className="ghost" href="/parcours">{t.call.back}</Link></p>
      </main>
    );
  }
  const endsAt = planCalls ? null : conv.createdAt.getTime() + freeCallMinutes() * 60_000;

  const c = conv.character as { name: string; age: number; avatar?: unknown };

  return (
    <main className="wrap call-wrap">
      <p style={{ margin: 0 }}><Link href="/parcours">← {t.call.back}</Link></p>
      <CallRoom
        conversationId={conv.id}
        progressKey={conv.progressKey}
        name={c.name.trim() || t.chat.interlocutor}
        age={c.age}
        avatar={parseAvatar(c.avatar) ?? DEFAULT_AVATAR}
        languageLabel={storedLanguageLabel(conv.language, conv.languageName, locale)}
        initialMessages={conv.messages.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", text: m.text }))}
        remaining={quota.remaining}
        endsAt={endsAt}
        theme={themeFor(conv.progressKey.startsWith("custom:") ? "custom" : conv.progressKey)}
      />
      <p className="muted small" style={{ margin: 0, textAlign: "center" }}>{t.chat.remaining(quota.remaining)} · {t.call.illustrated}</p>
    </main>
  );
}
