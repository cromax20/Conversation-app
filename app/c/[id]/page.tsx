import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { quotaFor } from "@/lib/plan";
import { voiceEnabled } from "@/lib/voice";
import { displayName, type Character } from "@/lib/characters";
import { MIN_EXAM_ANSWERS } from "@/lib/progress";
import Chat from "@/components/Chat";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?callbackUrl=/c/${id}`);

  const conv = await prisma.conversation.findFirst({
    where: { id, userId: user.id },
    include: { messages: { orderBy: { createdAt: "asc" }, select: { id: true, role: true, text: true } } },
  });
  if (!conv) notFound();

  const c = conv.character as Character;
  const exam = conv.mode === "exam";
  const quota = await quotaFor(user.id, user);
  const name = exam ? "Examinateur·rice" : displayName(c);

  return (
    <main className="wrap">
      <p style={{ margin: 0 }}><Link href="/conversations">← Mes conversations</Link></p>
      <article className="card">
        <div className="stamp">{conv.level}</div>
        {exam ? (
          <>
            <h1 className="who">Épreuve de passage {conv.level}</h1>
            <ul className="facts"><li>{conv.languageName}</li><li>environ 8 échanges</li><li>évaluation à la fin</li></ul>
            <p className="scene">Répondez naturellement, comme dans une vraie conversation. Pas de correction pendant l'épreuve.</p>
          </>
        ) : (
          <>
            <h1 className="who">{c.name.trim() || "Votre interlocuteur·rice"}, {c.age} ans{c.city.trim() ? `, ${c.city.trim()}` : ""}</h1>
            <ul className="facts">
              {[c.job, c.trait, "aime " + c.hobby, conv.languageName].map((x) => <li key={x}>{x}</li>)}
            </ul>
            <p className="scene"><b>{conv.scene}</b> · {conv.context}.</p>
          </>
        )}
        <Chat
          conversationId={conv.id}
          mode={exam ? "exam" : "practice"}
          examResult={(conv.examResult as never) ?? null}
          minExamAnswers={MIN_EXAM_ANSWERS}
          characterName={name}
          initialMessages={conv.messages.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", text: m.text }))}
          pro={quota.pro}
          voiceAvailable={voiceEnabled()}
          remaining={quota.remaining}
          limit={quota.limit}
        />
      </article>
    </main>
  );
}
