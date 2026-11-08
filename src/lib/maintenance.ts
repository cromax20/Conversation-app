// Ménage quotidien : on ne garde que les données utiles (moins de stockage, moins d'énergie).
import { prisma } from "./db";
import { purgeCache } from "./ai-cache";

export async function dailyMaintenance(now = new Date()) {
  const ago = (days: number) => new Date(now.getTime() - days * 86_400_000);
  const [cache, usageEvents, aiUsage, tokens, sessions] = await Promise.all([
    purgeCache(now),
    // Compteurs de limites : seuls le jour et la semaine en cours servent.
    prisma.usageEvent.deleteMany({ where: { createdAt: { lt: ago(35) } } }),
    // Coûts détaillés : 13 mois suffisent pour la comptabilité.
    prisma.aiUsage.deleteMany({ where: { createdAt: { lt: ago(400) } } }),
    prisma.verificationToken.deleteMany({ where: { expires: { lt: now } } }),
    prisma.session.deleteMany({ where: { expires: { lt: now } } }),
  ]);
  return { cache, usageEvents: usageEvents.count, aiUsage: aiUsage.count, tokens: tokens.count, sessions: sessions.count };
}
