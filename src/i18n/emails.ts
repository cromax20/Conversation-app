// E-mails de relance, dans les 6 langues du site.
import type { Locale } from "./index";

type Mail = { subject: string; title: string; body: string; cta: string };
type Kind = "streak" | "comeback" | "offer";
type Vars = { n?: number; p?: number };

const M: Record<Locale, Record<Kind, (v: Vars) => Mail> & { unsubscribe: string; footer: string }> = {
  fr: {
    streak: ({ n }) => ({ subject: `🔥 Votre série de ${n} jours vous attend`, title: `Ne perdez pas votre série de ${n} jours !`, body: "Quelques répliques aujourd'hui suffisent pour la garder. Votre personnage vous attend.", cta: "Reprendre la conversation" }),
    comeback: () => ({ subject: "Votre personnage s'ennuie de vous 💬", title: "On reprend là où vous vous étiez arrêté·e ?", body: "Une petite conversation de 5 minutes, et vous retrouvez vos réflexes. Vos cartes et votre parcours vous attendent.", cta: "Revenir sur Alomundo" }),
    offer: ({ p }) => ({ subject: `⏳ Dernières heures : −${p} % sur l'annuel`, title: `Votre offre de bienvenue se termine bientôt`, body: `Profitez de −${p} % sur la première année de la formule annuelle de votre choix : voix, appels vidéo et cartes illimitées.`, cta: "Voir l'offre" }),
    unsubscribe: "Ne plus recevoir ces e-mails", footer: "Alomundo · Allô, le monde t'écoute.",
  },
  en: {
    streak: ({ n }) => ({ subject: `🔥 Your ${n}-day streak is waiting`, title: `Don't lose your ${n}-day streak!`, body: "A few lines today are enough to keep it. Your character is waiting for you.", cta: "Continue the conversation" }),
    comeback: () => ({ subject: "Your character misses you 💬", title: "Pick up where you left off?", body: "A quick 5-minute chat and you'll get your reflexes back. Your cards and your path are waiting.", cta: "Back to Alomundo" }),
    offer: ({ p }) => ({ subject: `⏳ Last hours: −${p}% on yearly plans`, title: "Your welcome offer ends soon", body: `Get −${p}% on the first year of the yearly plan of your choice: voice, video calls and unlimited cards.`, cta: "See the offer" }),
    unsubscribe: "Stop receiving these emails", footer: "Alomundo · Hello, the world is listening.",
  },
  es: {
    streak: ({ n }) => ({ subject: `🔥 Tu racha de ${n} días te espera`, title: `¡No pierdas tu racha de ${n} días!`, body: "Unas pocas réplicas hoy bastan para mantenerla. Tu personaje te espera.", cta: "Seguir la conversación" }),
    comeback: () => ({ subject: "Tu personaje te echa de menos 💬", title: "¿Retomamos donde lo dejaste?", body: "Una charla de 5 minutos y recuperas los reflejos. Tus tarjetas y tu camino te esperan.", cta: "Volver a Alomundo" }),
    offer: ({ p }) => ({ subject: `⏳ Últimas horas: −${p} % en los planes anuales`, title: "Tu oferta de bienvenida termina pronto", body: `Aprovecha −${p} % el primer año del plan anual que elijas: voz, videollamadas y tarjetas ilimitadas.`, cta: "Ver la oferta" }),
    unsubscribe: "No recibir más estos correos", footer: "Alomundo · Aló, el mundo te escucha.",
  },
  pt: {
    streak: ({ n }) => ({ subject: `🔥 Sua sequência de ${n} dias está te esperando`, title: `Não perca sua sequência de ${n} dias!`, body: "Algumas falas hoje bastam para mantê-la. Seu personagem está te esperando.", cta: "Continuar a conversa" }),
    comeback: () => ({ subject: "Seu personagem está com saudade 💬", title: "Vamos continuar de onde você parou?", body: "Uma conversa de 5 minutos e você recupera os reflexos. Seus cartões e sua trilha estão te esperando.", cta: "Voltar ao Alomundo" }),
    offer: ({ p }) => ({ subject: `⏳ Últimas horas: −${p} % nos planos anuais`, title: "Sua oferta de boas-vindas termina em breve", body: `Aproveite −${p} % no primeiro ano do plano anual que preferir: voz, videochamadas e cartões ilimitados.`, cta: "Ver a oferta" }),
    unsubscribe: "Não receber mais estes e-mails", footer: "Alomundo · Alô, o mundo está te ouvindo.",
  },
  ar: {
    streak: ({ n }) => ({ subject: `🔥 سلسلتك من ${n} أيام في انتظارك`, title: `لا تخسر سلسلتك من ${n} أيام!`, body: "بضع جمل اليوم تكفي للحفاظ عليها. شخصيتك في انتظارك.", cta: "تابع المحادثة" }),
    comeback: () => ({ subject: "شخصيتك اشتاقت إليك 💬", title: "هل نكمل من حيث توقفت؟", body: "محادثة قصيرة لخمس دقائق وتستعيد عاداتك. بطاقاتك ومسارك في انتظارك.", cta: "العودة إلى Alomundo" }),
    offer: ({ p }) => ({ subject: `⏳ الساعات الأخيرة: خصم ${p} ٪ على الخطط السنوية`, title: "عرضك الترحيبي ينتهي قريبًا", body: `استفد من خصم ${p} ٪ على السنة الأولى من الخطة السنوية التي تختارها: صوت ومكالمات فيديو وبطاقات بلا حدود.`, cta: "عرض العرض" }),
    unsubscribe: "إيقاف هذه الرسائل", footer: "Alomundo · ألو، العالم يسمعك.",
  },
  de: {
    streak: ({ n }) => ({ subject: `🔥 Deine ${n}-Tage-Serie wartet`, title: `Verlier deine ${n}-Tage-Serie nicht!`, body: "Ein paar Sätze heute reichen, um sie zu halten. Deine Figur wartet auf dich.", cta: "Gespräch fortsetzen" }),
    comeback: () => ({ subject: "Deine Figur vermisst dich 💬", title: "Machen wir dort weiter, wo du aufgehört hast?", body: "Ein kurzes 5-Minuten-Gespräch und du bist wieder drin. Deine Karten und dein Weg warten.", cta: "Zurück zu Alomundo" }),
    offer: ({ p }) => ({ subject: `⏳ Letzte Stunden: −${p} % auf Jahrestarife`, title: "Dein Willkommensangebot endet bald", body: `Sichere dir −${p} % im ersten Jahr des Jahrestarifs deiner Wahl: Stimme, Videoanrufe und unbegrenzte Karten.`, cta: "Zum Angebot" }),
    unsubscribe: "Diese E-Mails abbestellen", footer: "Alomundo · Hallo, die Welt hört dir zu.",
  },
};

export function renderEmail(locale: Locale, kind: Kind, vars: Vars, links: { cta: string; unsubscribe: string }) {
  const L = M[locale] ?? M.fr;
  const m = L[kind](vars);
  const dir = locale === "ar" ? "rtl" : "ltr";
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<!doctype html><html lang="${locale}" dir="${dir}"><body style="margin:0;background:#f2f4f7;font-family:Arial,sans-serif;color:#1b2433">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:linear-gradient(120deg,#4b2bd8,#ff5f8f);background-color:#6b33e0;color:#fff;padding:20px 24px;font-size:20px;font-weight:bold">📞 Alomundo</td></tr>
<tr><td style="padding:24px"><h1 style="font-size:22px;margin:0 0 12px">${esc(m.title)}</h1><p style="font-size:16px;line-height:1.5;margin:0 0 20px">${esc(m.body)}</p>
<a href="${links.cta}" style="display:inline-block;background:#ff3d81;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px">${esc(m.cta)}</a></td></tr>
<tr><td style="padding:16px 24px;font-size:12px;color:#5a6578">${esc(L.footer)} · <a href="${links.unsubscribe}" style="color:#5a6578">${esc(L.unsubscribe)}</a></td></tr>
</table></td></tr></table></body></html>`;
  return { subject: m.subject, html };
}
