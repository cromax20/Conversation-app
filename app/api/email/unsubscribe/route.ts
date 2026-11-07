import { prisma } from "@/lib/db";
import { unsubscribeToken } from "@/lib/emails";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const u = url.searchParams.get("u") ?? "";
  const ok = u && url.searchParams.get("s") === unsubscribeToken(u);
  if (ok) await prisma.user.updateMany({ where: { id: u }, data: { emailOptOut: true } });
  const msg = ok ? "C'est fait : vous ne recevrez plus ces e-mails. · Done: you won't receive these emails any more." : "Lien invalide. · Invalid link.";
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font-family:sans-serif;padding:32px;text-align:center"><h1>📞 Alomundo</h1><p>${msg}</p><a href="/">Alomundo</a></body>`, {
    status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
