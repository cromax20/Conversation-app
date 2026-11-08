"use client";
import { useEffect } from "react";
// Onglet caché : les animations s'arrêtent (rien ne sert de dessiner ce que personne ne voit).
export default function PauseHidden() {
  useEffect(() => {
    const sync = () => document.documentElement.toggleAttribute("data-hidden", document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  return null;
}
