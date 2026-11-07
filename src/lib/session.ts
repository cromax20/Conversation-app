import { auth } from "@/auth";
import { prisma } from "./db";

/** Utilisateur connecté (avec ses champs d'abonnement), ou null. */
export async function currentUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}
