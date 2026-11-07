import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn, googleEnabled } from "@/auth";
import { getI18n } from "@/i18n/server";

function safeCallback(v: string | undefined) {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; sent?: string; error?: string }> }) {
  const sp = await searchParams;
  const { t } = await getI18n();
  const callbackUrl = safeCallback(sp.callbackUrl);
  const session = await auth();
  if (session?.user) redirect(callbackUrl);

  if (sp.sent) {
    return (
      <main className="wrap">
        <h1>{t.login.sentTitle}</h1>
        <p className="lede">{t.login.sentText}</p>
      </main>
    );
  }

  async function emailSignIn(formData: FormData) {
    "use server";
    try {
      await signIn("resend", { email: String(formData.get("email") ?? ""), redirectTo: callbackUrl });
    } catch (e) {
      if (e instanceof AuthError) redirect(`/login?error=email&callbackUrl=${encodeURIComponent(callbackUrl)}`);
      throw e;
    }
  }
  async function googleSignIn() {
    "use server";
    await signIn("google", { redirectTo: callbackUrl });
  }

  return (
    <main className="wrap" style={{ maxWidth: 440 }}>
      <header>
        <h1>{t.login.title}</h1>
        <p className="lede">{t.login.lede}</p>
      </header>
      {sp.error && <p className="banner" role="alert">{t.login.error}</p>}
      <div className="card stack">
        {googleEnabled && (
          <>
            <form action={googleSignIn}><button className="btn" style={{ width: "100%" }} type="submit">{t.login.google}</button></form>
            <div className="divider">{t.login.or}</div>
          </>
        )}
        <form action={emailSignIn} className="stack">
          <label className="stack" style={{ gap: 4 }}>
            <span className="label">{t.login.email}</span>
            <input type="email" name="email" required autoComplete="email" placeholder={t.login.emailPlaceholder} />
          </label>
          <button className={googleEnabled ? "ghost" : "btn"} type="submit">{t.login.sendLink}</button>
        </form>
      </div>
    </main>
  );
}
