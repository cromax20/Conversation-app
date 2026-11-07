import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

const providers: Provider[] = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}

// Lien magique par e-mail. Sans clé Resend (développement local), le lien est
// simplement affiché dans le terminal au lieu d'être envoyé.
providers.push(
  Resend({
    from: process.env.EMAIL_FROM ?? "Alomundo <onboarding@resend.dev>",
    ...(process.env.AUTH_RESEND_KEY
      ? {}
      : {
          apiKey: "dev",
          async sendVerificationRequest({ identifier, url }) {
            if (process.env.NODE_ENV === "production" && !process.env.E2E) {
              throw new Error("AUTH_RESEND_KEY manquant : impossible d'envoyer l'e-mail de connexion.");
            }
            console.log(`\n[connexion] Lien magique pour ${identifier} :\n${url}\n`);
          },
        }),
  }),
);

export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: "database" },
  trustHost: true,
  pages: { signIn: "/login", verifyRequest: "/login?sent=1" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
