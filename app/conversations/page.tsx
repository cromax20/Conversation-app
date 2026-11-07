import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { getI18n } from "@/i18n/server";
import { storedLanguageLabel } from "@/i18n";
import DeleteConversation from "@/components/DeleteConversation";

export default async function ConversationsPage() {
  const user = await currentUser();
  if (!user) redirect("/login?callbackUrl=/conversations");
  const { locale, t } = await getI18n();
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });

  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, mode: true, level: true, language: true, languageName: true, scene: true, sceneIndex: true, character: true, updatedAt: true, _count: { select: { messages: true } } },
    take: 200,
  });

  const titleOf = (c: (typeof conversations)[number]) => {
    const lang = storedLanguageLabel(c.language, c.languageName, locale);
    const name = ((c.character as { name?: string }).name ?? "").trim() || t.chat.interlocutor;
    if (c.mode === "exam") return `${t.exam.title(c.level)} · ${lang}`;
    if (c.mode === "call") return `${t.list.callTitle(name)} · ${lang}`;
    const scene = c.scene === "free" ? t.home.freeTalk : c.sceneIndex != null ? t.data.scenes[c.sceneIndex]?.[0] : t.yourScene;
    return `${name} · ${scene ?? c.scene} · ${lang}`;
  };

  return (
    <main className="wrap">
      <div className="row">
        <h1>{t.list.title}</h1>
        <Link className="btn" href="/">{t.list.newCharacter}</Link>
      </div>
      {conversations.length === 0 ? (
        <p className="muted">{t.list.empty} <Link href="/">{t.list.createFirst}</Link>.</p>
      ) : (
        <ul className="list">
          {conversations.map((c) => {
            const title = titleOf(c);
            return (
              <li key={c.id}>
                <div>
                  <Link className="title" href={c.mode === "call" ? `/appel/${c.id}` : `/c/${c.id}`}>{title}</Link>
                  <div className="muted small">{c.level} · {t.list.messages(c._count.messages)} · {fmt.format(c.updatedAt)}</div>
                </div>
                <DeleteConversation id={c.id} title={title} />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
