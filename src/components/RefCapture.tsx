"use client";
import { useEffect } from "react";
// Lien de parrainage (?ref=CODE) : mémorisé 30 jours, utilisé à la création du compte.
export default function RefCapture() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && /^[A-Za-z0-9]{5,10}$/.test(ref)) document.cookie = `ref=${ref.toUpperCase()}; path=/; max-age=${30 * 86400}; samesite=lax`;
  }, []);
  return null;
}
