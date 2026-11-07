import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { isLocale } from "@/i18n";
// Mémorise la langue du site sur le compte (pour les e-mails).
export async function POST(req: Request) {
  const session = await auth();
  const { locale } = await req.json().catch(() => ({}));
  if (!session?.user?.id || !isLocale(locale)) return new Response(null, { status: 204 });
  await prisma.user.update({ where: { id: session.user.id }, data: { locale } });
  return new Response(null, { status: 204 });
}
