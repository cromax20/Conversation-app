import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn, googleEnabled } from "@/auth";

function safeCallback(v: string | undefined) {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; sent?: string; error?: string }> }) {
  const sp = await searchParams;
  const callbackUrl = safeCallback(sp.callbackUrl);
  const session = await auth();
  if (session?.user) redirect(callbackUrl);

  if (sp.sent) {
    return (
      <main className="wrap">
        <h1>Vérifiez vos e-mails</h1>
        <p className="lede">Un lien de connexion vient de vous être envoyé. Il est valable 24 heures.</p>
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
        <h1>Connexion</h1>
        <p className="lede">Un compte garde vos personnages et l'historique de vos conversations.</p>
      </header>
      {sp.error && <p className="banner" role="alert">La connexion n'a pas abouti. Vérifiez l'adresse et réessayez.</p>}
      <div className="card stack">
        {googleEnabled && (
          <>
            <form action={googleSignIn}><button className="btn" style={{ width: "100%" }} type="submit">Continuer avec Google</button></form>
            <div className="divider">ou</div>
          </>
        )}
        <form action={emailSignIn} className="stack">
          <label className="stack" style={{ gap: 4 }}>
            <span className="label">Adresse e-mail</span>
            <input type="email" name="email" required autoComplete="email" placeholder="vous@exemple.com" />
          </label>
          <button className={googleEnabled ? "ghost" : "btn"} type="submit">Recevoir un lien de connexion</button>
        </form>
      </div>
    </main>
  );
}
