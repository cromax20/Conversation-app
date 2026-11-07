import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import DeleteConversation from "@/components/DeleteConversation";

const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });

export default async function ConversationsPage() {
  const user = await currentUser();
  if (!user) redirect("/login?callbackUrl=/conversations");

  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, level: true, updatedAt: true, _count: { select: { messages: true } } },
    take: 200,
  });

  return (
    <main className="wrap">
      <div className="row">
        <h1>Mes conversations</h1>
        <Link className="btn" href="/">Nouveau personnage</Link>
      </div>
      {conversations.length === 0 ? (
        <p className="muted">Aucune conversation pour l'instant. <Link href="/">Créez votre premier personnage</Link>.</p>
      ) : (
        <ul className="list">
          {conversations.map((c) => (
            <li key={c.id}>
              <div>
                <Link className="title" href={`/c/${c.id}`}>{c.title}</Link>
                <div className="muted small">{c.level} · {c._count.messages} messages · {fmt.format(c.updatedAt)}</div>
              </div>
              <DeleteConversation id={c.id} title={c.title} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
