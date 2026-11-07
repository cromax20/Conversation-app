import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { notFound, unauthorized } from "@/lib/http";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const res = await prisma.conversation.deleteMany({ where: { id, userId: user.id } });
  if (res.count === 0) return notFound();
  return new Response(null, { status: 204 });
}
