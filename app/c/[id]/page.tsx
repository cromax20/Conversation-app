import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { quotaFor } from "@/lib/plan";
import { voiceEnabled } from "@/lib/voice";
import { type Character } from "@/lib/characters";
import { MIN_EXAM_ANSWERS } from "@/lib/progress";
import { getI18n } from "@/i18n/server";
import { NATIVE_CODES, nativeFrenchName, nativeLabel, storedLanguageLabel, translateField } from "@/i18n";
import Chat from "@/components/Chat";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?callbackUrl=/c/${id}`);
  const { locale, t } = await getI18n();

  const conv = await prisma.conversation.findFirst({
    where: { id, userId: user.id },
    include: { messages: { orderBy: { createdAt: "asc" }, select: { id: true, role: true, text: true } } },
  });
  if (!conv) notFound();
  if (conv.mode === "call") redirect(`/appel/${conv.id}`);

  const c = conv.character as Character;
  const exam = conv.mode === "exam";
  const quota = await quotaFor(user.id, user);
  const lang = storedLanguageLabel(conv.language, conv.languageName, locale);
  const name = exam ? t.chat.examiner : c.name.trim() || t.chat.interlocutor;
  const nativeCode = NATIVE_CODES.find((n) => nativeFrenchName(n) === conv.nativeLang);
  const nativeName = nativeCode ? nativeLabel(nativeCode, locale) : conv.nativeLang;
  const scene = conv.scene === "free" ? [t.home.freeTalk, t.home.freeTalkDesc] : conv.sceneIndex != null ? t.data.scenes[conv.sceneIndex] : [t.yourScene, conv.context];

  return (
    <main className="wrap">
      <p style={{ margin: 0 }}><Link href="/conversations">{t.chat.backToList}</Link></p>
      <article className="card">
        <div className="stamp">{conv.level}</div>
        {exam ? (
          <>
            <h1 className="who">{t.exam.title(conv.level)}</h1>
            <ul className="facts"><li>{lang}</li>{t.exam.facts.map((f) => <li key={f}>{f}</li>)}</ul>
            <p className="scene">{t.exam.intro}</p>
          </>
        ) : (
          <>
            <h1 className="who">{name}, {t.home.years(c.age)}{c.city.trim() ? `, ${c.city.trim()}` : ""}</h1>
            <ul className="facts">
              {[translateField(t, "jobs", c.job), translateField(t, "traits", c.trait), t.home.likes(translateField(t, "hobbies", c.hobby)), lang].map((x) => <li key={x}>{x}</li>)}
            </ul>
            <p className="scene"><b>{scene[0]}</b> · {scene[1]}.</p>
          </>
        )}
        <Chat
          conversationId={conv.id}
          mode={exam ? "exam" : "practice"}
          examResult={(conv.examResult as never) ?? null}
          minExamAnswers={MIN_EXAM_ANSWERS}
          level={conv.level}
          nativeName={nativeName}
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
