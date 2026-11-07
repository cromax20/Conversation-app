import { runDailyEmails } from "@/lib/emails";

export const maxDuration = 60;

// Appelé une fois par jour par Vercel Cron (voir vercel.json), avec « Authorization: Bearer CRON_SECRET ».
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Non autorisé", { status: 401 });
  const sent = await runDailyEmails();
  return Response.json({ sent });
}
